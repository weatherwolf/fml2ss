from token_count import TokenCount
import os

tc = TokenCount(model_name="gpt-3.5-turbo")

def count_tokens(file_path):
    with open(file_path, 'r') as file:
        text = file.read()
        tokens = tc.num_tokens_from_string(text)
        return tokens

def iterate_hierarchy(root_dir):
    total_tokens = 0
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith('.json'):
                file_path = os.path.join(root, file)
                try:
                    tokens = count_tokens(file_path)
                    total_tokens += tokens
                    print(f"Tokens in {file_path}: {tokens}")
                except Exception as e:
                    print(f"Error reading {file_path}: {e}")
    
    print(f"\nTotal tokens across all JSON files: {total_tokens}")
    return total_tokens

if __name__ == "__main__":
    # Count tokens in the output_reference folder
    output_ref_path = "output_reference"
    if os.path.exists(output_ref_path):
        iterate_hierarchy(output_ref_path)
    else:
        print(f"Directory {output_ref_path} not found")