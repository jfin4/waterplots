import sys

def check_non_printable_chars(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            line_number = 1
            for line in file:
                non_printable_chars = [char for char in line if ord(char) < 32 and ord(char) not in (9, 10, 13) or ord(char) == 127]
                if non_printable_chars:
                    # Print line number and non-printable characters in a readable format
                    print(f"Line {line_number}: {repr(''.join(non_printable_chars))}")
                line_number += 1
    except FileNotFoundError:
        print(f"Error: The file '{file_path}' does not exist.")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python script.py <path_to_tsv_file>")
    else:
        file_path = sys.argv[1]
        check_non_printable_chars(file_path)

