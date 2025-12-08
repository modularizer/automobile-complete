#!/usr/bin/env python3
from automobile_complete.run.cli import run_input

if __name__ == "__main__":
    # a = input("what is your favorite animal?")
    b = run_input("what is your favorite animal?", completion_files=[], completions="a|ardvark;b|ug;c||tarantula;")
    # print(f"Regular input: {a}")
    print(f"Autocomplete input: {b}")
