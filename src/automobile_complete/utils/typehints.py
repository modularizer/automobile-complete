# Type aliases
from typing import Literal


Word = str  # A single word string
Prefix = str  # A prefix string (may or may not be a complete word)
Completion = str  # A completion/suffix string to append to a prefix
Freq = float  # Word frequency value
Prob = float  # Probability value (0.0 to 1.0)
Index = int  # Index into a list/array
RoundedFreq = int  # Rounded frequency value (integer)
Sort = Literal["prefix", "freq", "sum_freq"]  # Sorting options for word lists
# Composite type aliases
Words = list[tuple[Word, Freq]]  # List of (word, frequency) tuples