import json
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
file_name = "project.json"
file_path = os.path.join(current_dir, file_name)

def print_nested_keys(data, prefix=""):
    if isinstance(data, dict):
        for key, value in data.items():
            print_nested_keys(value, f"{prefix}{key}.")
    elif isinstance(data, list):
        for index, item in enumerate(data):
            print_nested_keys(item, f"{prefix}[{index}].")
    else:
        print(f"{prefix}{data}")

data = json.load(open(file_path))
print_nested_keys(data)