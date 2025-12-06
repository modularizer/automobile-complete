from automobile_complete import Trie

if __name__ == "__main__":
    t = Trie.from_file("assets/merged-completionlist.txt")
    x = t.lk
    print(x)