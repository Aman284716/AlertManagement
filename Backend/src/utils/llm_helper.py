import openai
from typing import Dict, Any, Optional
import os
import json

class LLMHelper:
    def __init__(self, 
                 azure_endpoint: Optional[str] = None, 
                 api_key: Optional[str] = None, 
                 api_version: Optional[str] = None,
                 azure_deployment: Optional[str] = "gpt-4o"):
        
        self.azure_endpoint = azure_endpoint or os.getenv('AZURE_OPENAI_ENDPOINT')
        self.api_key = api_key or os.getenv('AZURE_OPENAI_API_KEY')
        self.api_version = api_version or os.getenv('AZURE_API_VERSION', '2024-02-15-preview')
        self.azure_deployment = azure_deployment
        
        if not self.azure_endpoint or not self.api_key:
            raise ValueError("Azure OpenAI endpoint and API key must be provided.")

        self.client = openai.AzureOpenAI(
            azure_endpoint=self.azure_endpoint,
            api_key=self.api_key,
            api_version=self.api_version
        )
        self.model = self.azure_deployment
        
    async def generate_response(self, prompt: str, max_tokens: int = 1000) -> str:
        """Generate a response using the Azure OpenAI API."""
        try:
            response = self.client.chat.completions.create(
                model=self.model, # This refers to the deployment name in Azure OpenAI
                messages=[
                    {"role": "system", "content": "You are an expert banking fraud analyst."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=max_tokens,
                temperature=0.1
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"Error generating response: {str(e)}"

    async def analyze_patterns(self, data: Dict[str, Any], alert_type: str) -> Dict[str, Any]:
        """Analyze patterns in data using LLM, returning a structured JSON response.""" 
        prompt = f"""
Analyze the following banking data for a {alert_type} alert investigation:
{json.dumps(data, indent=2)}

Identify:
1. Suspicious patterns
2. Risk indicators
3. Confidence level (0-1)
4. Key evidence points

Return a JSON response with keys: patterns, risk_indicators, confidence, evidence.
        """ 
        response = await self.generate_response(prompt)
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            return {"patterns": [], "risk_indicators": [], "confidence": 0.5, "evidence": []}

    async def generate_explanation(self, context: Dict[str, Any], patterns: Dict[str, Any]) -> str:
        """Generate a human-readable explanation from investigation context and patterns.""" 
        prompt = f"""
Based on the investigation context and detected patterns, generate a clear explanation for the alert.
CONTEXT: {json.dumps(context, indent=2)}
PATTERNS: {json.dumps(patterns, indent=2)}

Generate a professional, clear explanation suitable for compliance reporting.
        """ 
        return await self.generate_response(prompt)