from typing import List, Dict, Any, Optional, Tuple
from models.schemas import IntentType, ResponseStyle, IntentHistory
from bson import ObjectId
from datetime import datetime
import asyncio
import random
import torch
from transformers import T5Tokenizer, T5ForConditionalGeneration, BertTokenizer, BertForSequenceClassification
import os
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Đường dẫn mới cho mô hình AI (dùng đường dẫn tương đối, đảm bảo chạy đúng khi chạy từ backend)
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../models/ai_models'))
INTENT_MODEL_PATH = os.path.join(BASE_DIR, 'intent_model', 'model_output_intent_v8', 'best_model')
SUGGEST_MODEL_PATH = os.path.join(BASE_DIR, 'suggest_model', 'flan_t5_trained_model_v1.00')
ABBR_DICT_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '../models/abbreviation_dict.json'))

class AIService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            logger.info("Creating new AIService instance...")
            cls._instance = super(AIService, cls).__new__(cls)
            cls._instance.initialized = False
            cls._instance.t5_tokenizer_v101 = None
            cls._instance.t5_model_v101 = None
        return cls._instance

    def __init__(self):
        if self.initialized:
            return
        
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"AI Service is using device: {self.device}")

        # Load models and tokenizers
        try:
            self._load_abbreviations()
            self._load_intent_model()
            self._load_suggestion_model()
            self.initialized = True
            logger.info("✅ AIService initialized successfully.")
        except Exception as e:
            logger.error(f"🔥 Failed to initialize AIService: {e}", exc_info=True)
            self.initialized = False

    def _load_abbreviations(self):
        logger.info(f"Loading abbreviation dictionary from {ABBR_DICT_PATH}...")
        if not os.path.exists(ABBR_DICT_PATH):
            raise FileNotFoundError(f"Abbreviation dictionary not found at {ABBR_DICT_PATH}")
        with open(ABBR_DICT_PATH, 'r', encoding='utf-8') as f:
            self.abbr_dict = json.load(f)

    def _load_intent_model(self):
        logger.info(f"Loading intent model from {INTENT_MODEL_PATH}...")
        if not os.path.isdir(INTENT_MODEL_PATH):
             raise FileNotFoundError(f"Intent model directory not found at {INTENT_MODEL_PATH}")
        self.intent_tokenizer = BertTokenizer.from_pretrained(INTENT_MODEL_PATH)
        self.intent_model = BertForSequenceClassification.from_pretrained(INTENT_MODEL_PATH)
        self.intent_model.to(self.device).eval()
        self.intent_label_map = {
            0: "intent_clarification", 1: "intent_commitment", 2: "intent_delay",
            3: "intent_follow_up", 4: "intent_greeting", 5: "intent_negotiation",
            6: "intent_propose_offer", 7: "intent_rejection"
        }

    def _load_suggestion_model(self):
        logger.info(f"Loading suggestion model from {SUGGEST_MODEL_PATH}...")
        if not os.path.isdir(SUGGEST_MODEL_PATH):
            raise FileNotFoundError(f"Suggestion model directory not found at {SUGGEST_MODEL_PATH}")
        self.t5_tokenizer = T5Tokenizer.from_pretrained(SUGGEST_MODEL_PATH)
        self.t5_model = T5ForConditionalGeneration.from_pretrained(SUGGEST_MODEL_PATH)
        self.t5_model.to(self.device)

    def _preprocess_sentence(self, sentence: str) -> str:
        if not sentence or not isinstance(sentence, str):
            return ""
        # Simple word replacement based on the dictionary
        words = sentence.split()
        replaced_words = [self.abbr_dict.get(word.lower(), word) for word in words]
        return " ".join(replaced_words)

    def classify_intent(self, text: str) -> Tuple[str, float]:
        if not self.initialized:
            raise RuntimeError("AIService is not initialized.")
        
        cleaned_text = self._preprocess_sentence(text)
        inputs = self.intent_tokenizer.encode_plus(
            cleaned_text, add_special_tokens=True, max_length=128,
            padding="max_length", truncation=True, return_tensors="pt"
        )
        input_ids = inputs["input_ids"].to(self.device)
        attention_mask = inputs["attention_mask"].to(self.device)
        
        with torch.no_grad():
            outputs = self.intent_model(input_ids, attention_mask=attention_mask)
            logits = outputs.logits
            confidence = torch.softmax(logits, dim=1).max().item()
            predicted_label_id = torch.argmax(logits, dim=1).item()
        
        intent = self.intent_label_map.get(predicted_label_id, "unknown_intent")
        return intent, confidence

    def generate_suggestion(self, text: str, style: str = "formal", model_version: str = "v1.00") -> str:
        if not self.initialized:
            raise RuntimeError("AIService is not initialized.")
        logger.info(f"[AI SUGGESTION] Using model version: {model_version}")
        intent, _ = self.classify_intent(text)
        cleaned_text = self._preprocess_sentence(text)
        style_map = {
            "simple": ("style: simple. Keep it short and simple.", 25),
            "friendly": ("style: friendly", 50),
            "formal": ("style: formal", 70)
        }
        style_prompt, max_words = style_map.get(style.lower(), style_map["formal"])
        input_text = f"SCN_UNKNOWN | {intent} | {cleaned_text} | {style_prompt}"
        if model_version == "v1.01":
            model_dir = os.path.join(BASE_DIR, 'suggest_model', 'flan_t5_trained_model_v1.01')
            if self.t5_tokenizer_v101 is None or self.t5_model_v101 is None:
                logger.info(f"Loading T5 v1.01 from {model_dir}...")
                from transformers import T5Tokenizer, T5ForConditionalGeneration
                self.t5_tokenizer_v101 = T5Tokenizer.from_pretrained(model_dir)
                self.t5_model_v101 = T5ForConditionalGeneration.from_pretrained(model_dir)
                self.t5_model_v101.to(self.device)
            tokenizer = self.t5_tokenizer_v101
            model = self.t5_model_v101
        else:
            model_dir = os.path.join(BASE_DIR, 'suggest_model', 'flan_t5_trained_model_v1.00')
            tokenizer = self.t5_tokenizer
            model = self.t5_model
        input_ids = tokenizer(input_text, return_tensors="pt").input_ids.to(self.device)
        for _ in range(5):
            output_ids = model.generate(
                input_ids,
                do_sample=True, top_k=30, top_p=0.95,
                temperature=1.0, max_length=100, num_return_sequences=1
            )
            response = tokenizer.decode(output_ids[0], skip_special_tokens=True)
            if len(response.split()) <= max_words:
                return response
        return response

    async def classify_intent_async(self, message: str) -> IntentType:
        """Async wrapper for intent classification"""
        try:
            intent, confidence = self.classify_intent(message)
            # Map string intent to IntentType enum
            intent_mapping = {
                "intent_clarification": IntentType.CLARIFICATION,
                "intent_commitment": IntentType.COMMITMENT,
                "intent_delay": IntentType.DELAY,
                "intent_follow_up": IntentType.FOLLOW_UP,
                "intent_greeting": IntentType.GREETING,
                "intent_negotiation": IntentType.NEGOTIATION,
                "intent_propose_offer": IntentType.PROPOSE_OFFER,
                "intent_rejection": IntentType.REJECTION
            }
            return intent_mapping.get(intent, IntentType.UNCATEGORIZED)
        except Exception as e:
            logger.error(f"❌ Intent classification failed: {e}")
            return IntentType.UNCATEGORIZED

    async def generate_response_async(self, message: str, intent: IntentType, 
                                    style: ResponseStyle = ResponseStyle.FRIENDLY) -> str:
        """Async wrapper for response generation"""
        try:
            style_mapping = {
                ResponseStyle.FORMAL: "formal",
                ResponseStyle.FRIENDLY: "friendly", 
                ResponseStyle.SIMPLE: "simple"
            }
            style_str = style_mapping.get(style, "friendly")
            return self.generate_suggestion(message, style_str)
        except Exception as e:
            logger.error(f"❌ Response generation failed: {e}")
            return "Cảm ơn bạn đã liên hệ. Chúng tôi sẽ phản hồi sớm nhất có thể."

    async def generate_suggestions_async(self, message: str, style: str = "friendly") -> List[str]:
        """Generate response suggestions asynchronously"""
        try:
            suggestions = []
            
            # Generate main suggestion
            main_suggestion = self.generate_suggestion(message, style)
            suggestions.append(main_suggestion)
            
            # Generate alternative suggestions with different styles
            other_styles = ["simple", "formal", "friendly"]
            for other_style in other_styles:
                if other_style != style and len(suggestions) < 3:
                    suggestion = self.generate_suggestion(message, other_style)
                    if suggestion not in suggestions:
                        suggestions.append(suggestion)
            
            return suggestions[:3]  # Return max 3 suggestions
            
        except Exception as e:
            logger.error(f"❌ Suggestion generation failed: {e}")
            return ["Cảm ơn bạn đã liên hệ. Chúng tôi sẽ phản hồi sớm nhất có thể."]

    async def get_ai_performance_metrics(self) -> Dict:
        """Get AI model performance metrics"""
        return {
            "models_loaded": {
                "intent_classification": self.intent_model is not None,
                "response_generation": self.t5_model is not None,
                "abbreviation_dict": len(self.abbr_dict) > 0
            },
            "device_info": {
                "device": str(self.device)
            },
            "model_paths": {
                "intent_model": INTENT_MODEL_PATH,
                "suggest_model": SUGGEST_MODEL_PATH,
                "abbr_dict": ABBR_DICT_PATH
            }
        }

# Singleton instance for the application to use
ai_service_instance = AIService()

def get_ai_service():
    # This dependency will be used in FastAPI routes
    if not ai_service_instance.initialized:
        # Here you might want to decide if you want to re-attempt initialization
        # or just raise an error to stop the server from starting.
        # For now, we raise an error if any request comes in before the service is ready.
        raise RuntimeError("AI Service is not ready or failed to initialize.")
    return ai_service_instance

class IntentHistoryService:
    def __init__(self, db):
        self.collection = db['intent_history']

    async def add_intent(self, message_id, room_id, intent, confidence, classified_by, note=None):
        doc = {
            'message_id': ObjectId(message_id),
            'room_id': room_id,
            'intent': intent,
            'confidence': confidence,
            'classified_by': classified_by,
            'created_at': datetime.utcnow(),
            'note': note
        }
        result = await self.collection.insert_one(doc)
        return str(result.inserted_id)

    async def get_intents_by_message(self, message_id):
        cursor = self.collection.find({'message_id': ObjectId(message_id)}).sort('created_at', 1)
        return [IntentHistory(**doc) async for doc in cursor]

    async def get_intents_by_room(self, room_id):
        cursor = self.collection.find({'room_id': room_id}).sort('created_at', 1)
        return [IntentHistory(**doc) async for doc in cursor]

    async def delete_intent(self, intent_id):
        result = await self.collection.delete_one({'_id': ObjectId(intent_id)})
        return result.deleted_count == 1

    async def update_intent(self, intent_id, update_fields: dict):
        result = await self.collection.update_one({'_id': ObjectId(intent_id)}, {'$set': update_fields})
        return result.modified_count == 1

    def _predict_intent(self, text: str) -> Tuple[str, float]:
        """Predict intent using BERT model"""
        if not self.intent_model:
            # Fallback to mock intent
            return "intent_greeting", 0.8
        
        try:
            cleaned_text = self._preprocess_sentence(text)
            inputs = self.intent_tokenizer.encode_plus(
                cleaned_text, 
                add_special_tokens=True, 
                max_length=128,
                padding="max_length", 
                truncation=True, 
                return_tensors="pt"
            )
            
            input_ids = inputs["input_ids"].to(self.device)
            attention_mask = inputs["attention_mask"].to(self.device)
            
            with torch.no_grad():
                outputs = self.intent_model(input_ids, attention_mask=attention_mask)
                logits = outputs.logits
                predicted_label = torch.argmax(logits, dim=1).item()
                confidence = torch.softmax(logits, dim=1).max().item()
            
            return self.intent_label_map[predicted_label], confidence
            
        except Exception as e:
            logger.error(f"❌ Intent prediction failed: {e}")
            return "intent_greeting", 0.5
    
    def _generate_response(self, input_text: str, style: str = "friendly", max_words: int = 50) -> str:
        """Generate response using FLAN-T5 model"""
        if not self.t5_model:
            # Fallback to mock response
            return "Cảm ơn bạn đã liên hệ. Chúng tôi sẽ phản hồi sớm nhất có thể."
        
        try:
            # Prepare input based on style
            if style == "simple":
                prompt = f"SCN_UNKNOWN | {input_text} | style: simple. Keep it short and simple."
                max_words = 25
            elif style == "friendly":
                prompt = f"SCN_UNKNOWN | {input_text} | style: friendly"
                max_words = 50
            else:
                prompt = f"SCN_UNKNOWN | {input_text} | style: formal"
                max_words = 70
            
            input_ids = self.t5_tokenizer(prompt, return_tensors="pt").input_ids.to(self.device)
            
            # Generate with length control
            output_ids = self.t5_model.generate(
                input_ids,
                do_sample=True,
                top_k=30,
                top_p=0.95,
                temperature=1.0,
                max_length=60,
                num_return_sequences=1
            )
            
            response = self.t5_tokenizer.decode(output_ids[0], skip_special_tokens=True)
            
            # Limit word count
            words = response.split()
            if len(words) > max_words:
                response = " ".join(words[:max_words])
            
            return response
            
        except Exception as e:
            logger.error(f"❌ Response generation failed: {e}")
            return "Cảm ơn bạn đã liên hệ. Chúng tôi sẽ phản hồi sớm nhất có thể."
    
    async def analyze_message(self, message: str) -> Dict:
        """Analyze message and return intent classification"""
        try:
            intent, confidence = self.classify_intent(message)
            suggestions = await self.generate_suggestions(message)
            return {
                "intent": intent,
                "confidence": confidence,
                "message": message,
                "processed_message": self._preprocess_sentence(message),
                "suggestions": suggestions
            }
        except Exception as e:
            logger.error(f"❌ Message analysis failed: {e}")
            return {
                "intent": "intent_greeting",
                "confidence": 0.5,
                "message": message,
                "processed_message": message,
                "suggestions": []
            }
    
    async def generate_suggestions(self, message: str, style: str = "friendly") -> List[str]:
        """Generate response suggestions"""
        try:
            intent, confidence = self.classify_intent(message)
            
            # Generate multiple suggestions with different styles
            suggestions = []
            
            # Main suggestion
            main_suggestion = self.generate_suggestion(intent, style)
            suggestions.append(main_suggestion)
            
            # Alternative suggestions
            if style != "simple":
                simple_suggestion = self.generate_suggestion(intent, "simple")
                if simple_suggestion != main_suggestion:
                    suggestions.append(simple_suggestion)
            
            if style != "formal":
                formal_suggestion = self.generate_suggestion(intent, "formal")
                if formal_suggestion != main_suggestion:
                    suggestions.append(formal_suggestion)
            
            return suggestions[:3]  # Return max 3 suggestions
            
        except Exception as e:
            logger.error(f"❌ Suggestion generation failed: {e}")
            return ["Cảm ơn bạn đã liên hệ. Chúng tôi sẽ phản hồi sớm nhất có thể."]
    
    async def get_ai_performance_metrics(self) -> Dict:
        """Get AI model performance metrics"""
        return {
            "models_loaded": {
                "intent_classification": self.intent_model is not None,
                "response_generation": self.t5_model is not None,
                "abbreviation_dict": len(self.abbr_dict) > 0
            },
            "device_info": {
                "device": str(self.device)
            },
            "model_paths": {
                "intent_model": INTENT_MODEL_PATH,
                "suggest_model": SUGGEST_MODEL_PATH,
                "abbr_dict": ABBR_DICT_PATH
            }
        }

    async def classify_intent(self, message: str) -> IntentType:
        """
        Classify the intent of a message using BERT model
        TODO: Replace with actual BERT model inference
        """
        # Simulate async processing
        await asyncio.sleep(0.1)
        
        message_lower = message.lower()
        
        # Simple keyword-based classification for demo
        for intent, keywords in self.intent_keywords.items():
            for keyword in keywords:
                if keyword in message_lower:
                    return intent
        
        # If no keywords match, return uncategorized
        return IntentType.UNCATEGORIZED

    async def generate_response(self, message: str, intent: IntentType, 
                              style: ResponseStyle = ResponseStyle.FRIENDLY) -> str:
        """
        Generate response using FLAN-T5 model
        TODO: Replace with actual FLAN-T5 model inference
        """
        # Simulate async processing
        await asyncio.sleep(0.2)
        
        # Get templates for the intent and style
        if intent in self.response_templates and style in self.response_templates[intent]:
            templates = self.response_templates[intent][style]
            return random.choice(templates)
        
        # Fallback response
        fallback_responses = {
            ResponseStyle.FORMAL: "Cảm ơn bạn đã liên hệ. Tôi sẽ hỗ trợ bạn sớm nhất có thể.",
            ResponseStyle.FRIENDLY: "Cảm ơn bạn! 😊 Mình sẽ cố gắng giúp bạn!",
            ResponseStyle.SIMPLE: "Cảm ơn bạn. Tôi sẽ giúp bạn."
        }
        
        return fallback_responses.get(style, fallback_responses[ResponseStyle.FRIENDLY])

    async def generate_multiple_suggestions(self, message: str, intent: IntentType, 
                                          count: int = 3) -> List[str]:
        """Generate multiple response suggestions with different styles"""
        suggestions = []
        
        for style in [ResponseStyle.FORMAL, ResponseStyle.FRIENDLY, ResponseStyle.SIMPLE]:
            if len(suggestions) < count:
                suggestion = await self.generate_response(message, intent, style)
                suggestions.append(suggestion)
        
        return suggestions[:count]

    async def get_intent_confidence(self, message: str, intent: IntentType) -> float:
        """
        Get confidence score for intent classification
        TODO: Replace with actual model confidence
        """
        # Simulate confidence score
        await asyncio.sleep(0.05)
        
        message_lower = message.lower()
        keywords = self.intent_keywords.get(intent, [])
        
        if not keywords:
            return 0.5
        
        # Calculate simple confidence based on keyword matches
        matches = sum(1 for keyword in keywords if keyword in message_lower)
        confidence = min(0.95, 0.3 + (matches * 0.2))
        
        return confidence

    # TODO: Add methods for model loading and initialization
    async def load_models(self):
        """Load BERT and FLAN-T5 models"""
        # This will be implemented when integrating actual models
        pass

    async def preprocess_text(self, text: str) -> str:
        """Preprocess text for model input"""
        # Basic preprocessing
        return text.strip().lower()

    async def postprocess_response(self, response: str) -> str:
        """Postprocess model response"""
        # Basic postprocessing
        return response.strip() 