#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Şifre Tahmini ve Akıllı Varyasyon Üretim Motoru
Verilen tahmini şifre(ler)den öncelik sıralı akıllı mutasyonlar türetir.
"""

import itertools
import re
from typing import Iterator, Set, List

# Türkçe - İngilizce harf dönüşüm haritaları
TR_TO_EN = str.maketrans({
    'ç': 'c', 'Ç': 'C',
    'ğ': 'g', 'Ğ': 'G',
    'ı': 'i', 'İ': 'I',
    'ö': 'o', 'Ö': 'O',
    'ş': 's', 'Ş': 'S',
    'ü': 'u', 'Ü': 'U'
})

EN_TO_TR_MAP = {
    'c': ['c', 'ç'], 'C': ['C', 'Ç'],
    'g': ['g', 'ğ'], 'G': ['G', 'Ğ'],
    'i': ['i', 'ı'], 'I': ['I', 'İ'],
    'o': ['o', 'ö'], 'O': ['O', 'Ö'],
    's': ['s', 'ş'], 'S': ['S', 'Ş'],
    'u': ['u', 'ü'], 'U': ['U', 'Ü']
}

LEET_MAP = {
    'a': ['a', '4', '@'], 'A': ['A', '4', '@'],
    'e': ['e', '3'],      'E': ['E', '3'],
    'i': ['i', '1', '!'], 'I': ['I', '1'],
    'ı': ['ı', '1'],      'İ': ['İ', '1'],
    'o': ['o', '0'],      'O': ['O', '0'],
    's': ['s', '5', '$'], 'S': ['S', '5', '$'],
    'ş': ['ş', 's', '5'], 'Ş': ['Ş', 'S', '5'],
    't': ['t', '7'],      'T': ['T', '7'],
    'b': ['b', '8'],      'B': ['B', '8'],
}

ADJACENT_KEYS = {
    'q': 'wasa12', 'w': 'qeasd23', 'e': 'wrsdf34', 'r': 'etdfg45', 't': 'ryfgh56',
    'y': 'tughj67', 'u': 'yihjk78', 'i': 'uojkl89', 'o': 'ipklş90', 'p': 'oğlşi0*',
    'a': 'qwsz', 's': 'awedxz', 'd': 'serfcx', 'f': 'drtgvc', 'g': 'ftyhbv',
    'h': 'gyujnb', 'j': 'huikmn', 'k': 'jiolm', 'l': 'kopö', 'ş': 'lpöç',
    'z': 'asx', 'x': 'zsdc', 'c': 'xdfv', 'v': 'cfgb', 'b': 'vghn', 'n': 'bhjm',
    'm': 'njk'
}

PRIORITY_YEARS = ["2026", "2025", "2024", "2023", "2022", "2021", "2020", "2019", "2018", "2015", "2010", "2000"]
HISTORICAL_YEARS = ["1453", "1923", "1881", "1071"]
FOOTBALL_YEARS = ["1903", "1905", "1907", "1967", "1925", "1963"]
ALL_YEARS = [str(y) for y in range(1960, 2030)]
TURKISH_PLATERANGE = [f"{i:02d}" for i in range(1, 82)] + [str(i) for i in range(1, 10)]
PRIORITY_NUMS = ["1", "12", "123", "1234", "12345", "01", "00", "99"]
COMMON_SYMBOLS = ["!", ".", "*", "#", "?", "_", "-", "@"]
COMMON_SUFFIX_WORDS = ["kasa", "not", "vault", "sifre", "pass", "app", "yedek", "guvenli"]


def generate_case_variants(word: str) -> Set[str]:
    variants = set()
    variants.add(word)
    variants.add(word.lower())
    variants.add(word.upper())
    variants.add(word.capitalize())
    variants.add(word.title())
    variants.add(word.swapcase())
    return variants


def generate_turkish_variants(word: str) -> Set[str]:
    variants = set()
    variants.add(word)
    en_word = word.translate(TR_TO_EN)
    variants.add(en_word)
    
    if len(word) <= 10:
        chars_opts = [EN_TO_TR_MAP.get(c, [c]) for c in word]
        for combo in itertools.product(*chars_opts):
            variants.add("".join(combo))
            if len(variants) > 64:
                break
    return variants


def generate_leet_variants(word: str, max_limit: int = 48) -> Set[str]:
    variants = set()
    variants.add(word)
    chars_opts = [LEET_MAP.get(c, [c]) for c in word]
    count = 0
    for combo in itertools.product(*chars_opts):
        variants.add("".join(combo))
        count += 1
        if count >= max_limit:
            break
    return variants


def generate_typo_variants(word: str) -> Set[str]:
    variants = set()
    variants.add(word)
    length = len(word)
    
    for i in range(length - 1):
        swapped = list(word)
        swapped[i], swapped[i+1] = swapped[i+1], swapped[i]
        variants.add("".join(swapped))

    if length > 3:
        for i in range(length):
            variants.add(word[:i] + word[i+1:])

    for i in range(length):
        variants.add(word[:i] + word[i] + word[i:])

    for i, c in enumerate(word.lower()):
        adj = ADJACENT_KEYS.get(c, "")
        for neighbor in adj:
            mutated = list(word)
            mutated[i] = neighbor if word[i].islower() else neighbor.upper()
            variants.add("".join(mutated))

    return variants


def extract_base_tokens(inputs: List[str]) -> Set[str]:
    tokens = set()
    for raw in inputs:
        cleaned = raw.strip()
        if not cleaned: continue
        tokens.add(cleaned)
        
        # Ayırıcılarla böl
        for sep in [' ', '_', '-', '.', ',', ':', ';', '/']:
            if sep in cleaned:
                for part in cleaned.split(sep):
                    if part.strip():
                        tokens.add(part.strip())

        # CamelCase ve sayı ayrıştırma (Örn: GizliSifre2024 -> Gizli, Sifre, 2024)
        camel_parts = re.findall(r'[A-ZÇĞİÖŞÜ][a-zçğıöşü]*|[a-zçğıöşü]+|\d+', cleaned)
        if len(camel_parts) > 1:
            for cp in camel_parts:
                if cp.strip():
                    tokens.add(cp.strip())

        # Bitişik yazılmış uzun kelimeleri 2 parçaya bölerek dene (Örn: gizlisifre -> gizli + sifre)
        if len(cleaned) >= 6 and len(cleaned) <= 18:
            for i in range(3, len(cleaned) - 2):
                p1, p2 = cleaned[:i], cleaned[i:]
                tokens.add(p1)
                tokens.add(p2)
                tokens.add(f"{p1.capitalize()}{p2.capitalize()}")
                tokens.add(f"{p1.lower()}{p2.capitalize()}")

    return tokens


def generate_variations(
    inputs: List[str],
    level: str = "standard",
    custom_suffixes: List[str] = None,
    custom_prefixes: List[str] = None
) -> Iterator[str]:
    seen: Set[str] = set()
    custom_suffixes = custom_suffixes or []
    custom_prefixes = custom_prefixes or []

    def yield_if_new(cand: str):
        if cand and cand not in seen:
            seen.add(cand)
            return cand
        return None

    # Kullanıcının girdiği kelimeler
    raw_inputs = [raw.strip() for raw in inputs if raw.strip()]
    tokens = extract_base_tokens(raw_inputs)
    combined_words = set(tokens)

    # 1. Kullanıcının doğrudan girdiği kelimelerin permütasyonları (Örn: 'kasa' ve 'yedegi')
    if len(raw_inputs) >= 2:
        for p in itertools.permutations(raw_inputs, min(len(raw_inputs), 3)):
            combos = [
                "".join(p),
                "".join(w.capitalize() for w in p),
                "".join(w.lower() for w in p),
                "".join(w.upper() for w in p),
                "_".join(p),
                "_".join(w.capitalize() for w in p),
                "_".join(w.lower() for w in p),
                "-".join(p),
                "-".join(w.capitalize() for w in p),
                ".".join(p),
                ".".join(w.capitalize() for w in p),
            ]
            for c in combos:
                combined_words.add(c)

    # =========================================================================
    # ÖNCELİK 1: YÜKSEK OLASILIKLI ADAYLAR
    # =========================================================================
    high_priority_words = set()
    for w in combined_words:
        high_priority_words.add(w)
        high_priority_words.add(w.lower())
        high_priority_words.add(w.capitalize())
        high_priority_words.add(w.upper())
        high_priority_words.add(w.translate(TR_TO_EN))

    # 1.1 Doğrudan kelimelerin kendisi
    for w in sorted(high_priority_words, key=len):
        c = yield_if_new(w)
        if c: yield c

    # 1.2 Kelime + Popüler Yıl / Sayı / Sembol
    popular_years = PRIORITY_YEARS + FOOTBALL_YEARS + HISTORICAL_YEARS
    popular_nums = PRIORITY_NUMS
    popular_syms = ["!", ".", "*", "#", "?"]

    for w in high_priority_words:
        # Kelime + Yıl (Örn: GizliSifre2024, Kasa_Yedegi_2025, Ahmet1905)
        for sep in ["", "_", "-"]:
            for y in popular_years:
                c = yield_if_new(f"{w}{sep}{y}")
                if c: yield c
                # Kelime + Yıl + ! (Örn: GizliSifre2024!, Ahmet_1905!)
                for sym in ["!", ".", "*"]:
                    c = yield_if_new(f"{w}{sep}{y}{sym}")
                    if c: yield c

        # Kelime + Sayı
        for sep in ["", "_"]:
            for n in popular_nums:
                c = yield_if_new(f"{w}{sep}{n}")
                if c: yield c
                for sym in ["!", "."]:
                    c = yield_if_new(f"{w}{sep}{n}{sym}")
                    if c: yield c

        # Kelime + Sembol
        for sym in popular_syms:
            c = yield_if_new(f"{w}{sym}")
            if c: yield c

        # Özel kullanıcı son ekleri
        for suff in custom_suffixes:
            c = yield_if_new(f"{w}{suff}")
            if c: yield c
            c = yield_if_new(f"{w}_{suff}")
            if c: yield c
            c = yield_if_new(f"{w}{suff}!")
            if c: yield c

    if level == "fast":
        return

    # =========================================================================
    # ÖNCELİK 2: STANDART GENİŞLETİLMİŞ VARYASYONLAR
    # =========================================================================
    extended_words = set(high_priority_words)
    for w in list(high_priority_words):
        tr_vars = generate_turkish_variants(w)
        extended_words.update(tr_vars)
        if len(extended_words) < 1500:
            extended_words.update(generate_leet_variants(w))

    all_nums = PRIORITY_NUMS + ALL_YEARS + TURKISH_PLATERANGE
    all_syms = COMMON_SYMBOLS + ["!!", "!!!", ".."]

    # Separators: "", "_", "-", "."
    for sep in ["", "_", "-", "."]:
        for w in extended_words:
            for n in all_nums:
                c = yield_if_new(f"{w}{sep}{n}")
                if c: yield c
                for s in ["!", ".", "*"]:
                    c = yield_if_new(f"{w}{sep}{n}{s}")
                    if c: yield c

    for sep in ["", "_", "-"]:
        for w in extended_words:
            for s in all_syms:
                c = yield_if_new(f"{w}{sep}{s}")
                if c: yield c

    # Ön ekler
    prefixes = list(custom_prefixes) + ["!", ".", "#", "_", "123", "01"]
    for pre in prefixes:
        for w in high_priority_words:
            c = yield_if_new(f"{pre}{w}")
            if c: yield c
            for s in ["", "!", "1", "123"]:
                c = yield_if_new(f"{pre}{w}{s}")
                if c: yield c

    # Suffix kelimeleri
    for w in tokens:
        for sw in COMMON_SUFFIX_WORDS:
            for sc in [sw, sw.capitalize(), sw.upper()]:
                c = yield_if_new(f"{w}{sc}")
                if c: yield c
                c = yield_if_new(f"{w}_{sc}")
                if c: yield c
                for n in ["", "1", "123", "!"]:
                    c = yield_if_new(f"{w}{sc}{n}")
                    if c: yield c

    # Kelime ters çevirme (reverse)
    for w in tokens:
        rev = w[::-1]
        c = yield_if_new(rev)
        if c: yield c
        for suff in ["", "1", "123", "!"]:
            c = yield_if_new(f"{rev}{suff}")
            if c: yield c

    if level == "standard":
        return

    # =========================================================================
    # ÖNCELİK 3: DERİNLEMESİNE (DEEP) - KLAVYE VE TYPO VARYASYONLARI
    # =========================================================================
    typo_words = set()
    for w in list(tokens):
        typo_words.update(generate_typo_variants(w))

    for tw in typo_words:
        for c in generate_case_variants(tw):
            c_val = yield_if_new(c)
            if c_val: yield c_val
            for n in PRIORITY_NUMS + PRIORITY_YEARS:
                c_val = yield_if_new(f"{c}{n}")
                if c_val: yield c_val
                c_val = yield_if_new(f"{c}{n}!")
                if c_val: yield c_val
