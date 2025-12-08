"""Demo: Python Console usage

Run in an interactive console, to explore the attributes and functions on t and x.
"""
from automobile_complete import Trie

if __name__ == "__main__":
    t = Trie.from_words("to|rnados can kill")
    x = t.to
    print(x)