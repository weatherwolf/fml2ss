from dotenv import load_dotenv
import os
import openai
import sys
import os

# Add the parent directory to the path so we can import prompts
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from summarizer.prompts import SYSTEM_ROOM_PROMPT, USER_ROOM_PROMPT, SYSTEM_FLOOR_PROMPT, USER_FLOOR_PROMPT, SYSTEM_PROJECT_PROMPT, USER_PROJECT_PROMPT

class SummarizationService:
    def __init__(self):
        load_dotenv()
        self.api_key = os.getenv("API_KEY")
        openai.api_key = self.api_key
        
        # Cache prompts to avoid repeated string operations
        self._prompts = {
            'room': (SYSTEM_ROOM_PROMPT, USER_ROOM_PROMPT),
            'floor': (SYSTEM_FLOOR_PROMPT, USER_FLOOR_PROMPT),
            'project': (SYSTEM_PROJECT_PROMPT, USER_PROJECT_PROMPT)
        }
        
        if not self.api_key:
            print("Warning: No API key found")
    
    def summarize_room(self, room_data):
        """Generate room summary from room data"""
        return self._call_api(room_data, 'room')
    
    def summarize_floor(self, room_summaries):
        """Generate floor summary from room summaries"""
        return self._call_api(room_summaries, 'floor')
    
    def summarize_project(self, floor_summaries):
        """Generate project summary from floor summaries"""
        return self._call_api(floor_summaries, 'project')
    
    def _call_api(self, data, summary_type):
        """Single method to handle all API calls"""
        try:
            type_prompt = summary_type.upper()
            
            # Get the appropriate prompts
            if type_prompt == "ROOM":
                system_prompt = SYSTEM_ROOM_PROMPT
                user_prompt = USER_ROOM_PROMPT.format(data=data)
            elif type_prompt == "FLOOR":
                system_prompt = SYSTEM_FLOOR_PROMPT
                user_prompt = USER_FLOOR_PROMPT.format(data=data)
            elif type_prompt == "PROJECT":
                system_prompt = SYSTEM_PROJECT_PROMPT
                user_prompt = USER_PROJECT_PROMPT.format(data=data)
            else:
                raise ValueError(f"Unknown summary type: {summary_type}")
            
            response = openai.ChatCompletion.create(
                model="gpt-5-nano",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ]
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            print(f"Error calling API for {summary_type}: {e}")
            return None
