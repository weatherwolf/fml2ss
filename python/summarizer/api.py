from dotenv import load_dotenv
import os, json
import openai
import os
import sys

# Add the current directory to the Python path to ensure imports work
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from prompts import SYSTEM_ROOM_PROMPT, USER_ROOM_PROMPT, SYSTEM_FLOOR_PROMPT, USER_FLOOR_PROMPT

# Legacy functions - kept for backward compatibility
# New code should use SummarizationService and DataReader instead

def call_api(input, type):
    """Legacy function - use SummarizationService instead"""
    print("Warning: call_api is deprecated. Use SummarizationService instead.")
    from summarization_service import SummarizationService
    service = SummarizationService()
    return service._call_api(input, type)

def run_api(file_path_output=None, input_data=None, type=None, **kwargs):
    """Legacy function - use SummarizationService and DataReader instead"""
    print("Warning: run_api is deprecated. Use SummarizationService and DataReader instead.")
    
    if type == 'room':
        from summarization_service import SummarizationService
        service = SummarizationService()
        return service.summarize_room(input_data)
    
    elif type == 'floor':
        if kwargs and 'floor_id' in kwargs:
            from data_reader import DataReader
            rooms = DataReader.get_rooms_for_floor(kwargs['floor_id'], file_path_output)
            room_summaries = ""
            
            for room in rooms:
                if 'attrs' in room and 'summary' in room['attrs'] and room['attrs']['summary']:
                    room_summaries += room['attrs']['summary'] + "\n"
            
            if room_summaries.strip():
                from summarization_service import SummarizationService
                service = SummarizationService()
                return service.summarize_floor(room_summaries)
            else:
                print("No room summaries found for floor summarization")
                return None
        else:
            print("No floor_id provided in kwargs for run_api")
            return None
    else:
        print("Invalid type")
        return None




