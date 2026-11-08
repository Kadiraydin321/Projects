# -*- coding: utf-8 -*-
"""
translate_descriptions.py
GBFR.UI.BetterDescriptions modundaki İngilizce metin dosyalarını zengin Türkçe açıklamalarla çevirir.
Kaynak: en_backup
Hedef: en

Format belirteçleri ({0}, {1} vb.), satır sonları (\n), ok simgeleri (↑, ↓) ve özel etiketler (<d>)
bütünüyle korunur.
"""

import os
import sys
import json
import re

sys.stdout.reconfigure(encoding='utf-8')

BACKUP_DIR = r"D:\Games\Reloaded-II\Mods\GBFR.UI.BetterDescriptions\GBFR\data\system\table\text\en_backup"
TARGET_DIR = r"D:\Games\Reloaded-II\Mods\GBFR.UI.BetterDescriptions\GBFR\data\system\table\text\en"

# =========================================================================
# 1. Birebir Sözlük Eşleştirmeleri (Exact Matches)
# =========================================================================
EXACT_DICT = {
    # Temel UI Etiketleri
    "Confirm": "Onayla",
    "Cancel": "İptal",
    "Next": "İleri",
    "Back": "Geri",
    "Close": "Kapat",
    "Dismount": "İn",
    "Yes": "Evet",
    "No": "Hayır",
    "Skip": "Geç",
    "Retry": "Tekrar Dene",
    "Options": "Seçenekler",
    "Settings": "Ayarlar",
    "Save": "Kaydet",
    "Load": "Yükle",
    "Details": "Ayrıntılar",
    "None": "Yok",
    "Auto": "Otomatik",
    "Hold": "Tut",
    "Select": "Seç",
    "Change": "Değiştir",
    "Remove": "Çıkar",
    "Equip": "Kuşan",
    "Unequip": "Çıkar",
    "Sort": "Sırala",
    "Filter": "Filtrele",
    "Reset": "Sıfırla",
    "Apply": "Uygula",
    "Default": "Varsayılan",
    "ON": "AÇIK",
    "OFF": "KAPALI",
    "Display": "Görünüm",
    "Audio": "Ses",
    "Graphics": "Grafik",
    "Camera": "Kamera",
    "Controls": "Kontroller",
    "Difficulty": "Zorluk",
    "Story": "Hikâye",
    "Action": "Aksiyon",
    "Main Quest": "Ana Görev",
    "Side Quest": "Yan Görev",
    "Total": "Toplam",
    "Cost": "Maliyet",
    "Possessed": "Sahip Olunan",
    "Acquired": "Elde Edilen",
    "Sell": "Sat",
    "Buy": "Satın Al",
    "Upgrade": "Yükselt",
    "Awaken": "Uyandır",
    "Miracle": "Mucize",
    "Transmute": "Dönüştür",
    "Synthesis": "Sentez",
    "Information": "Bilgi",
    "Skills": "Yetenekler",
    "Masteries": "Ustalıklar (Masteries)",
    "Inventory": "Envanter",
    "Equipment": "Ekipman",
    "Party": "Ekip",
    "Quest": "Görev",
    "Rewards": "Ödüller",
    "Battle": "Savaş",
    "Level": "Seviye",
    "Status": "Statü",
    "System": "Sistem",

    # Status Temel Adları (text_status.json)
    "RESIST": "DİRENÇ",
    "ATK↑": "ATK↑ (Saldırı Artışı)",
    "DEF↑": "DEF↑ (Savunma Artışı)",
    "ATK↓": "ATK↓ (Saldırı Azalışı)",
    "DEF↓": "DEF↓ (Savunma Azalışı)",
    "DMG Cut": "Hasar Kesintisi (DMG Cut)",
    "Regen": "Yenilenme (Regen)",
    "Heal": "İyileştirme",
    "Cooldown": "Bekleme Süresi",
    "Invincibility": "Dokunulmazlık",
    "Supplementary DMG↑": "Ek Hasar↑ (Supplementary DMG)",
    "Stout Heart": "Sarsılmaz Yürek (Stout Heart)",
    "Mirror Image": "Gölge Görüntü (Mirror Image)",
    "Substitute": "Siper (Substitute)",
    "Covered": "Siper Altında",
    "Debuff Immunity": "Zayıflatma Bağışıklığı",
    "Shield": "Kalkan (Shield)",
    "Paralysis": "Felç (Paralysis)",
    "Slow": "Yavaşlatma (Slow)",
    "Freeze": "Donma (Freeze)",
    "Glaciate": "Buz Tutma (Glaciate)",
    "Burn": "Yanma (Burn)",
    "Poison": "Zehirlenme (Poison)",
    "Blight": "Çürüme (Blight)",
    "Dizzy": "Sersemlik (Dizzy)",
    "Stun": "Sersemletme (Stun)",
    "Hostility Up": "Düşman Tehdidi Artışı",
    "Hostility Down": "Düşman Tehdidi Azalışı",
    "DMG Cap↑": "Hasar Sınırı↑",
    "DMG Cap↓": "Hasar Sınırı↓",
    "Crit Rate↑": "Kritik Vuruş Oranı↑",
    "Crit DMG↑": "Kritik Hasar↑",
    "Drain": "Can Emme (Drain)",
    "Phantasm": "İllüzyon (Phantasm)",
    "Skill Sealed": "Yetenek Mühürlendi",
    "SBA Sealed": "Skybound Art Mühürlendi",
    "Defended by an ally": "Bir müttefik tarafından korunuyor",
    "Damage dealt is boosted": "Verilen hasar artırıldı",
    "Charge speed is boosted and orb gain is increased": "Şarj hızı ve küre kazanımı artırıldı",
    "Automatically recover from critical condition": "Kritik durumdan otomatik olarak toparlan",
    "Stun gauge is easier to fill": "Sersemletme göstergesi daha kolay dolar",

    # Limit Bonus Adları ve Kalıpları (text_limit_bonus.json)
    "Base Attack Up": "Temel Saldırı Artışı",
    "Base Defense Up": "Temel Savunma Artışı",
    "Base HP Up": "Temel Can Artışı",
    "Health Up": "Can Artışı",
    "Base Stun Up": "Temel Sersemletme Artışı",
    "Critical Hit Rate Up": "Kritik Vuruş Oranı Artışı",
    "Skill Damage Up": "Yetenek Hasarı Artışı",
    "Skill Damage Cap Up": "Yetenek Hasar Sınırı Artışı",
    "Skybound Art Damage Up": "Skybound Art Hasarı Artışı",
    "Skybound Art Damage Cap Up": "Skybound Art Hasar Sınırı Artışı",
    "Chain Burst Damage Up": "Chain Burst Hasarı Artışı",
    "Link Level Gain Up": "Bağlantı Seviyesi Kazanımı Artışı",
    "Healing Up": "İyileştirme Artışı",
    "Healing Cap Up": "İyileştirme Sınırı Artışı",
    "Normal Attack Damage Cap Up": "Normal Saldırı Hasar Sınırı Artışı",
    "Green Potion Stock Up": "Yeşil İksir Kapasite Artışı",
    "Unlock Sigil Slot": "Mühür (Sigil) Yuvası Aç",
    "Perfect Dodge": "Kusursuz Kaçınma",
    "Perfect Guard": "Kusursuz Savunma",
    "Launch": "Havaya Fırlatma",
    "Charged Parry": "Şarjlı Savuşturma (Parry)",
    "Arts Time Extension": "Arts Süresi Uzatımı",
    "Quicker  Charge": "Daha Hızlı Şarj",
    "Adrenaline Rush": "Adrenalin Patlaması",
    "Guard Break Mitigation": "Kalkan Kırılma Azaltımı",
    "Ares Gauge Gain Up": "Ares Gösterge Kazanımı Artışı",
    "Heat Gauge Dampener": "Isı Göstergesi Yavaşlatıcı",
    "Mobile Gunslinger": "Gezgin Silahşor",
    "Quick Cast Specs Up": "Hızlı Büyü Özellik Artışı",
    "Power Scope": "Güçlü Dürbün",
    "Strong-Stemmed Roses": "Güçlü Gövdeli Güller",
    "Rose Stock Up": "Gül Kapasitesi Artışı",
    "Spectral Connection": "Ruhani Bağlantı",
    "Agile Cuts": "Çevik Kesikler",
    "Wirbelwind": "Wirbelwind",
    "Lunge Attack Specs Up": "Atılma Saldırısı Özellik Artışı",
    "Freeflutter Stance Specs Up": "Freeflutter Duruşu Özellik Artışı",
    "Grynoth Gauge Effects Up": "Grynoth Göstergesi Etki Artışı",
    "Stun Power Up": "Sersemletme Gücü Artışı",
    "Grenade Stock Up": "El Bombası Kapasite Artışı",
    "Boosts Base Attack.": "Temel Saldırıyı artırır.",
    "Boosts base stun.": "Temel sersemletmeyi artırır.",
    "Boosts critical hit rate.": "Kritik vuruş oranını artırır.",
    "Boosts critical hit rate during link time.": "Link zamanında kritik vuruş oranını artırır.",
    "Boosts Pre-Cap DMG during link time.": "Link zamanında Sınır Öncesi Hasarı artırır.",
    "Boosts healing cap of healing skills and items.": "İyileştirme yeteneklerinin ve eşyalarının iyileştirme sınırını artırır.",
    "Boosts health points.": "Can puanlarını artırır.",
    "Boosts attack power.": "Saldırı gücünü artırır.",
    "Boosts amount of link level gained in battle.": "Savaşta kazanılan bağlantı seviyesini artırır.",
    "Grants unique bonus effects during link time.": "Link zamanında benzersiz bonus etkiler sağlar.",
    "Boosts the amount of link level gained upon triggering a\nfull burst.": "Full burst tetiklendiğinde kazanılan bağlantı (link) seviyesini artırır.",

    # Tips Başlıkları (text_tips.json)
    "Dash": "Atılma / Hızlı Koşu",
    "Jump": "Zıplama",
    "Target Priority": "Hedef Önceliği",
    "Airborne Attacks": "Havada Saldırılar",
    "Temporary Lock On and Target Switching": "Geçici Hedefe Kilitlenme ve Hedef Değiştirme",
    "Acquiring and Assigning Skills": "Yetenek Edinme ve Atama",
    "Skill Icons": "Yetenek Simgeleri",
    "Filling the Skybound Art Gauge": "Skybound Art Göstergesini Doldurma",
    "Properties of a Chain Burst": "Chain Burst Özellikleri",
    "Skybound Arts Activation Settings": "Skybound Art Etkinleştirme Ayarları",
    "Important Points about Guarding": "Savunma (Guard) Hakkında Önemli Noktalar",
    "Comboing after Dodging": "Kaçınmadan Sonra Kombo Yapma",
    "Taking a Heavy Hit": "Ağır Darbe Alma",
    "Stun Gauge and Link Chance": "Sersemletme Göstergesi ve Link Fırsatı",
    "Comboing after Link Attacks": "Link Saldırılarından Sonra Kombo Yapma",
    "Raising Link Level": "Link Seviyesini Yükseltme",
    "Effects of Recovery Items": "İyileştirme Eşyalarının Etkileri",
    "Damage Types and Colors": "Hasar Türleri ve Renkleri",
    "Defending Hallowed Ground": "Kutsal Alanı Savunma",
    "Link Attacks and Link Time": "Bağlantı Saldırıları ve Link Zamanı",
    "Overdrive and Break": "Overdrive ve Break Durumları",
    "Healing and Reviving": "İyileştirme ve Canlandırma",
    "Critical Condition": "Kritik Durum",
    "Support Actions": "Destek Eylemleri",
    "Elements and Weaknesses": "Elementler ve Zayıflıklar",
    "Sigils and Masteries": "Mühürler (Sigils) ve Ustalıklar (Masteries)",
    "Weapons and Forging": "Silahlar ve Dövme",
    "Side Quests and Bounties": "Yan Görevler ve Ödül Avları",
}

# =========================================================================
# 2. Düzenli İfade (Regex) Kuralları
# =========================================================================
REGEX_REPLACEMENTS = [
    # Status Formatları (BetterDescriptions Parametreleri)
    (r"ATK↑\s*\(\{0\}%\)\s*\(\{1\}s\)", r"ATK↑ (+{0}%) ({1}sn)"),
    (r"ATK↑\s*\(\{0\}%–\{1\}%\)\s*\(\{2\}s–\{3\}s\)", r"ATK↑ (+{0}%–+{1}%) ({2}sn–{3}sn)"),
    (r"DEF↑\s*\(\{0\}%\)\s*\(\{1\}s\)", r"DEF↑ (+{0}%) ({1}sn)"),
    (r"DEF↑\s*\(\{0\}%–\{1\}%\)\s*\(\{2\}s–\{3\}s\)", r"DEF↑ (+{0}%–+{1}%) ({2}sn–{3}sn)"),
    (r"ATK↓\s*\(\{0\}%\)\s*\(\{1\}s\)", r"ATK↓ (-{0}%) ({1}sn)"),
    (r"ATK↓\s*\(\{0\}%–\{1\}%\)\s*\(\{2\}s–\{3\}s\)", r"ATK↓ (-{0}%–-{1}%) ({2}sn–{3}sn)"),
    (r"DEF↓\s*\(\{0\}%\)\s*\(\{1\}s\)", r"DEF↓ (-{0}%) ({1}sn)"),
    (r"DEF↓\s*\(\{0\}%–\{1\}%\)\s*\(\{2\}s-\{3\}s\)", r"DEF↓ (-{0}%–-{1}%) ({2}sn–{3}sn)"),
    (r"DMG Cut\s*\(\{0\}%\)\s*\(\{1\}s\)", r"Hasar Kesintisi ({0}%) ({1}sn)"),
    (r"DMG Cut\s*\(\{0\}%–\{1\}%\)\s*\(\{2\}s–\{3\}s\)", r"Hasar Kesintisi ({0}%–{1}%) ({2}sn–{3}sn)"),
    (r"Regen\s*\(\{0\}%\s*Base HP\)\s*\(\{1\}s\)", r"Yenilenme ({0}% Temel Can) ({1}sn)"),
    (r"Regen\s*\(\{0\}%-\{1\}%\s*Base HP\)\s*\(\{2\}s-\{3\}s\)", r"Yenilenme ({0}%–{1}% Temel Can) ({2}sn–{3}sn)"),
    (r"Heal\s*\(\{0\}%\s*Base HP\)\s*\(\{1\}\s*Heal Cap\)", r"İyileştirme ({0}% Temel Can) ({1} İyileştirme Sınırı)"),
    (r"Heal\s*\(\{0\}%-\{1\}%\s*Base HP\)\s*\(\{2\}-\{3\}\s*Heal Cap\)", r"İyileştirme ({0}%–{1}% Temel Can) ({2}–{3} İyileştirme Sınırı)"),
    (r"Cooldown\s*\(\{0\}s\);\s*Channel or Attack Duration\s*\(\{1\}s\)", r"Bekleme Süresi ({0}sn); Kanal/Saldırı Süresi ({1}sn)"),
    (r"Cooldown\s*\(\{0\}s\)", r"Bekleme Süresi ({0}sn)"),
    (r"Invincibility\s*\(\{0\}s\)", r"Dokunulmazlık ({0}sn)"),
    (r"Invincibility\s*\(\{0\}s-\{1\}s\)", r"Dokunulmazlık ({0}sn–{1}sn)"),
    (r"Supplementary DMG↑\s*\(\{0\}%\)\s*\(\{1\}s\)", r"Ek Hasar↑ ({0}%) ({1}sn)"),
    (r"Stout Heart\s*\(\{0\}s\)", r"Sarsılmaz Yürek ({0}sn)"),
    (r"Mirror Image\s*\(\{0\}\s*Hits\)\s*\(\{1\}s\)", r"Gölge Görüntü ({0} Vuruş) ({1}sn)"),
    (r"Mirror Image\s*\(\{0\}\s*Hits\)\s*\(\{1\}s-\{2\}s\)", r"Gölge Görüntü ({0} Vuruş) ({1}sn–{2}sn)"),
    (r"Substitute\s*\(\{0\}s\)", r"Siper ({0}sn)"),
    (r"Substitute\s*\(\{0\}s-\{1\}s\)", r"Siper ({0}sn–{1}sn)"),
    (r"Debuff Immunity\s*\(\{0\}s\)", r"Zayıflatma Bağışıklığı ({0}sn)"),
    (r"Shield\s*\(\{0\}\)", r"Kalkan ({0})"),
    (r"Shield\s*\(\{0\}s\)", r"Kalkan ({0}sn)"),
    (r"Paralysis\s*\(\{0\}s\)", r"Felç ({0}sn)"),
    (r"Slow\s*\(\{0\}s\)", r"Yavaşlatma ({0}sn)"),
    (r"Freeze\s*\(\{0\}s\)", r"Donma ({0}sn)"),
    (r"Glaciate\s*\(\{0\}s\)", r"Buz Tutma ({0}sn)"),
    (r"Burn\s*\(\{0\}s\)", r"Yanma ({0}sn)"),
    (r"Poison\s*\(\{0\}s\)", r"Zehirlenme ({0}sn)"),
    (r"Blight\s*\(\{0\}s\)", r"Çürüme ({0}sn)"),
    (r"Dizzy\s*\(\{0\}s\)", r"Sersemlik ({0}sn)"),
    (r"Poison\s*\(\{0\}%\s*Base Attack\)\s*\(\{1\}s\)", r"Zehirlenme ({0}% Temel Saldırı) ({1}sn)"),
    (r"Burn\s*\(\{0\}%\s*Base Attack\)\s*\(\{1\}s\)", r"Yanma ({0}% Temel Saldırı) ({1}sn)"),

    # Skillboard / Mastery Temel Statlar
    (r"^Base HP \+\{0\}$", r"Temel Can +{0}"),
    (r"^Base ATK \+\{0\}$", r"Temel Saldırı +{0}"),
    (r"^Base Defense \+\{0\}$", r"Temel Savunma +{0}"),
    (r"^Base HP \+\{0\}%", r"Temel Can +{0}%"),
    (r"^Base ATK \+\{0\}%", r"Temel Saldırı +{0}%"),
    (r"^Base Defense \+\{0\}%", r"Temel Savunma +{0}%"),
    (r"^DMG Cap \+\{0\}%$", r"Hasar Sınırı +{0}%"),
    (r"^Critical Hit Rate \+\{0\}%$", r"Kritik Vuruş Oranı +{0}%"),
    (r"^Critical DMG \+\{0\}%$", r"Kritik Hasar +{0}%"),
    (r"^Stun Power \+\{0\}$", r"Sersemletme Gücü +{0}"),
    (r"^Stun Power \+\{0\}%$", r"Sersemletme Gücü +{0}%"),
    (r"^Elemental DMG \+\{0\}%\s*$", r"Elementel Hasar +{0}%"),
    (r"^Pre-Cap DMG \+\{0\}%$", r"Sınır Öncesi Hasar +{0}%"),
    (r"^Skill Cooldown Durations -\{0\}%$", r"Yetenek Bekleme Süreleri -{0}%"),
    (r"^Cooldown Duration -\{0\}%$", r"Bekleme Süresi -{0}%"),
    (r"^Skill Cooldown -\{0\}%$", r"Yetenek Bekleme Süresi -{0}%"),
    (r"^Charge Time -\{0\}%$", r"Şarj Süresi -{0}%"),
    (r"^Gauge Depletion -\{0\}%$", r"Gösterge Tüketimi -{0}%"),
    (r"^Gauge Gain \+\{0\}%$", r"Gösterge Kazanımı +{0}%"),
    (r"^Effect Duration \+\{0\}%$", r"Etki Süresi +{0}%"),

    # Limit Bonus Açıklamaları
    (r"^Boosts the Pre-Cap DMG dealt by (.+)\.$", r"\1 yeteneğinin Sınır Öncesi Hasarını artırır."),
    (r"^Boosts Pre-Cap DMG of (.+)\.$", r"\1 yeteneğinin Sınır Öncesi Hasarını artırır."),
    (r"^Reduces the cooldown for (.+)\.$", r"\1 yeteneğinin bekleme süresini azaltır."),
    (r"^Extends the duration of (.+)\.$", r"\1 yeteneğinin etki süresini uzatır."),
    (r"^Boosts the duration of (.+)\.$", r"\1 yeteneğinin süresini artırır."),
    (r"^Skill:\s*(.+)$", r"Yetenek: \1"),
    (r"^Enhanced\s*(.+)$", r"Gelişmiş \1"),
    (r"^(.+) Specs Up$", r"\1 Özellik Artışı"),
    (r"^(.+) Finisher Specs Up$", r"\1 Bitirici Vuruş Özellik Artışı"),

    # Skillboard Rank İfadeleri
    (r"Insight Rank <d>:", "Kavrayış Kademesi <d>:"),
    (r"Insight Rank <d><d>:", "Kavrayış Kademesi <d><d>:"),
    (r"Insight Rank <d><d><d>:", "Kavrayış Kademesi <d><d><d>:"),
    (r"Crux Rank <d>:", "Crux Kademesi <d>:"),
    (r"Crux Rank <d><d>:", "Crux Kademesi <d><d>:"),
    (r"Crux Rank <d><d><d>:", "Crux Kademesi <d><d><d>:"),
    (r"Essence Rank <d>:", "Öz (Essence) Kademesi <d>:"),
    (r"Essence Rank <d><d>:", "Öz (Essence) Kademesi <d><d>:"),
    (r"Essence Rank <d><d><d>:", "Öz (Essence) Kademesi <d><d><d>:"),

    # Skillboard Mühür / Sigil Şartları
    (r"DMG Cap \+\{0\}% per <d> Basic Stats-type sigil equipped\n\(max sigils: \{1\}\)",
     r"Kuşanılan her <d> Temel İstatistik tipi mühür başına Hasar Sınırı +{0}%\n(maksimum mühür: {1})"),
    (r"Base ATK \+\{0\}% per <d> Attack-type sigil equipped\n\(max sigils: \{1\}\)",
     r"Kuşanılan her <d> Saldırı tipi mühür başına Temel Saldırı +{0}%\n(maksimum mühür: {1})"),
    (r"HP \+\{0\} per <d> Defense- or <d> Support-type sigil\nequipped \(max sigils: \{1\}\)",
     r"Kuşanılan her <d> Savunma veya <d> Destek tipi mühür başına Can +{0}\n(maksimum mühür: {1})"),
    (r"Base Defense \+\{0\}% per <d> Defense- or <d> Support-type sigil\nequipped \(max sigils: \{1\}\)",
     r"Kuşanılan her <d> Savunma veya <d> Destek tipi mühür başına Temel Savunma +{0}%\n(maksimum mühür: {1})"),

    # Durum Şartları
    (r"Upon performing a perfect dodge:\nGrants Shield \(\{0\}\)",
     r"Kusursuz kaçınma yapıldığında:\nKalkan ({0}) sağlar"),
    (r"While in critical condition:\nCritical Gauge Depletion -\{0\}%",
     r"Kritik durumdayken:\nKritik Gösterge Tüketimi -{0}%"),
    (r"While inflicted with Blight <d>:\nDMG Cap \+\{0\}%",
     r"Çürüme (Blight) <d> etkisindeyken:\nHasar Sınırı +{0}%"),
    (r"While inflicted with Burn <d>:\nDMG Cap \+\{0\}%",
     r"Yanma (Burn) <d> etkisindeyken:\nHasar Sınırı +{0}%"),
    (r"While inflicted with Poison <d>:\nDMG Cap \+\{0\}%",
     r"Zehirlenme (Poison) <d> etkisindeyken:\nHasar Sınırı +{0}%"),
    (r"<d> Attacks:\nPre-Cap DMG \+\{0\}%",
     r"<d> Saldırıları:\nSınır Öncesi Hasar +{0}%"),
    (r"<d> Attacks:\nDMG Cap \+\{0\}%",
     r"<d> Saldırıları:\nHasar Sınırı +{0}%"),

    # EDL Auraları
    (r"Elemental DMG <d>\+\{12\}%<d>\nMax boost: <d>\{31\}%<d> based on the number of vitality\nauras acquired \(aura cap: \{30\}\)",
     r"Elementel Hasar <d>+{12}%<d>\nMaksimum artış: Kazanılan canlılık aurasına bağlı olarak <d>{31}%<d> (aura sınırı: {30})"),
    (r"DMG Cap <d>\+\{12\}%<d>\nMax boost: <d>\{31\}%<d> based on the number of\nsequestration auras acquired \(aura cap: \{30\}\)",
     r"Hasar Sınırı <d>+{12}%<d>\nMaksimum artış: Kazanılan tecrit aurasına bağlı olarak <d>{31}%<d> (aura sınırı: {30})"),
    (r"Elemental DMG <d>\+\{12\}%<d>\nMax boost: <d>\{31\}%<d> based on the number of\nfortification auras acquired \(aura cap: \{30\}\)",
     r"Elementel Hasar <d>+{12}%<d>\nMaksimum artış: Kazanılan tahkimat aurasına bağlı olarak <d>{31}%<d> (aura sınırı: {30})"),
    (r"DMG Dealt <d>\+\{12\}%<d>\nMax boost: <d>\{31\}%<d> based on the number of\ndread auras acquired \(aura cap: \{30\}\)",
     r"Verilen Hasar <d>+{12}%<d>\nMaksimum artış: Kazanılan dehşet aurasına bağlı olarak <d>{31}%<d> (aura sınırı: {30})"),
    (r"DMG Cap <d>\+\{12\}%<d>\nMax boost: <d>\{31\}%<d> based on the number of\ndestruction auras acquired \(aura cap: \{30\}\)",
     r"Hasar Sınırı <d>+{12}%<d>\nMaksimum artış: Kazanılan yıkım aurasına bağlı olarak <d>{31}%<d> (aura sınırı: {30})"),
    (r"DMG Cap <d>\+\{12\}%<d>\nMax boost: <d>\{31\}%<d> based on the number of\nwarfare auras acquired \(aura cap: \{30\}\)",
     r"Hasar Sınırı <d>+{12}%<d>\nMaksimum artış: Kazanılan harp aurasına bağlı olarak <d>{31}%<d> (aura sınırı: {30})"),
    (r"DEF <d>-\{12\}%<d>", r"DEF <d>-{12}%<d>"),
    (r"DMG Cap <d>\+\{12\}%<d>", r"Hasar Sınırı <d>+{12}%<d>"),

    # İkincil Terim Yer Değiştirmeleri (Kelimeler)
    (r"\bPre-Cap DMG\b", "Sınır Öncesi Hasar"),
    (r"\bDMG Cap\b", "Hasar Sınırı"),
    (r"\bCritical Hit Rate\b", "Kritik Vuruş Oranı"),
    (r"\bCritical DMG\b", "Kritik Hasar"),
    (r"\bStun Power\b", "Sersemletme Gücü"),
    (r"\bCooldown Duration\b", "Bekleme Süresi"),
    (r"\bBase HP\b", "Temel Can"),
    (r"\bBase ATK\b", "Temel Saldırı"),
    (r"\bBase Defense\b", "Temel Savunma"),
    (r"\bLink Attack\b", "Bağlantı Saldırısı (Link Attack)"),
    (r"\bLink Time\b", "Link Zamanı"),
    (r"\bSkybound Art\b", "Skybound Art"),
    (r"\bArts lvl\b", "Arts Seviyesi"),
    (r"\bArts Lvl\b", "Arts Seviyesi"),
    (r"\bSupplementary DMG\b", "Ek Hasar (Supplementary DMG)"),
    (r"\bBuff Duration\b", "Güçlendirme Süresi"),
    (r"\bDebuff Immunity\b", "Zayıflatma Bağışıklığı"),
    (r"\bPerfect Dodge\b", "Kusursuz Kaçınma"),
    (r"\bPerfect Guard\b", "Kusursuz Savunma"),
]

# text.json Yetenek Açıklamaları İçin Kalıplar
ABILITY_RULES = [
    (r"^A multi-hit slash attack with a wide attack radius\.\nDeals more hits based on Arts lvl\.$",
     "Geniş etki alanına sahip çok vuruşlu bir kılıç kesiği saldırısı.\nArts Seviyesine bağlı olarak daha fazla vuruş yapar."),
    (r"^A fast lunge attack that inflicts DEF↓ to a foe\.\nEffect strength and duration are based on Arts lvl\.$",
     "Düşmana DEF↓ uygulayan hızlı bir atılma saldırısı.\nEtki gücü ve süresi Arts Seviyesine bağlıdır."),
    (r"^Grants DMG Cut to the entire party\.\nEffect strength and duration are based on Arts lvl\.$",
     "Tüm ekibe Hasar Kesintisi (DMG Cut) sağlar.\nEtki gücü ve süresi Arts Seviyesine bağlıdır."),
    (r"^Casts a circle that restores allies' HP\.\nHold while casting to aim\.\nRestores more HP based on Arts lvl\.$",
     "Müttefiklerin Canını yenileyen bir şifa alanı oluşturur.\nNişan almak için basılı tutun.\nArts Seviyesine bağlı olarak daha fazla Can yeniler."),
    (r"^A ranged attack that showers an area with\nmagic arrows and inflicts ATK↓ to foes\.\nEffect strength and duration are based on Arts lvl\.$",
     "Bir alanı sihirli ok yağmuruna tutan ve düşmanlara ATK↓ uygulayan menzilli saldırı.\nEtki gücü ve süresi Arts Seviyesine bağlıdır."),
    (r"^Inflicts ATK↓ and DEF↓ to foes within the\nspell's circle\. Hold while casting to aim\.\nEffect strength and duration are based on Arts lvl\.$",
     "Büyü alanındaki düşmanlara ATK↓ ve DEF↓ uygular. Nişan almak için basılı tutun.\nEtki gücü ve süresi Arts Seviyesine bağlıdır."),
    (r"^Grants ATK↑ to the entire party\.\nEffect strength and duration are based on Arts lvl\.$",
     "Tüm ekibe ATK↑ sağlar.\nEtki gücü ve süresi Arts Seviyesine bağlıdır."),
    (r"^A dropkick that deals a high amount of stun\.\nDeals more damage and stun based on Arts lvl\.$",
     "Yüksek miktarda sersemletme uygulayan uçan tekme saldırısı.\nArts Seviyesine bağlı olarak daha fazla hasar ve sersemletme verir."),
    (r"^Casts a circle that removes all debuffs and grants\nRegen to allies\. Hold while casting to aim\.\nRegen restores more HP based on Arts lvl\.$",
     "Tüm zayıflatmaları kaldıran ve müttefiklere Yenilenme (Regen) veren bir alan açar.\nNişan almak için basılı tutun. Arts Seviyesine bağlı olarak daha fazla Can yeniler."),
    (r"^Fires a projectile that deals more hits\nbased on Arts lvl\.$",
     "Arts Seviyesine bağlı olarak daha fazla vuruş yapan bir mermi fırlatır."),
    (r"^Casts a spell that inflicts Slow to foes\.\nHold while casting to aim\.\nEffect duration is based on Arts lvl\.$",
     "Düşmanlara Yavaşlatma (Slow) uygulayan bir büyü yapar.\nNişan almak için basılı tutun. Etki süresi Arts Seviyesine bağlıdır."),
    (r"^Casts a circle that rescues allies from critical\ncondition\. Hold while casting to aim\.\nAllies recover with more HP based on Arts lvl\.$",
     "Müttefikleri kritik durumdan kurtaran bir canlandırma alanı açar.\nNişan almak için basılı tutun. Müttefikler Arts Seviyesine göre daha çok Canla toparlanır."),
    (r"^Grants Debuff Immunity to the entire party\.\nEffect duration is based on Arts lvl\.$",
     "Tüm ekibe Zayıflatma Bağışıklığı sağlar.\nEtki süresi Arts Seviyesine bağlıdır."),
    (r"^Deals damage and removes 1 buff from foes\.\nHold while casting to aim\.\nDeals more damage based on Arts lvl\.$",
     "Hasar verir ve düşmanların 1 güçlendirmesini kaldırır.\nNişan almak için basılı tutun. Arts Seviyesine göre daha fazla hasar verir."),
    (r"^Redistributes your SBA gauge to all allies\.\nThe amount shared is based on Arts lvl\.$",
     "Skybound Art (SBA) göstergenizi tüm müttefiklere paylaştırır.\nPaylaşılan miktar Arts Seviyesine bağlıdır."),
]


def translate_entry(text, filename=""):
    """Metin dizesini Türkçe'ye çevirir."""
    if not text or not isinstance(text, str):
        return text

    # 1. Birebir Sözlük Eşleşmesi
    if text in EXACT_DICT:
        return EXACT_DICT[text]

    # 2. Yetenek Açıklamaları
    for pat, rep in ABILITY_RULES:
        if re.search(pat, text):
            return re.sub(pat, rep, text)

    # 3. Regex Kuralları
    for pat, rep in REGEX_REPLACEMENTS:
        if re.search(pat, text):
            text = re.sub(pat, rep, text)

    # 4. Sayısal ve Saniye Formatı Temizlikleri
    text = re.sub(r"\b(\d+)s\b", r"\1sn", text)
    text = re.sub(r"\(\{0\}s\)", r"({0}sn)", text)
    text = re.sub(r"\(\{1\}s\)", r"({1}sn)", text)
    text = re.sub(r"\(\{2\}s\)", r"({2}sn)", text)
    text = re.sub(r"\(\{3\}s\)", r"({3}sn)", text)

    return text


def run_translation():
    target_files = [
        "text_status.json",
        "text_skillboard.json",
        "text_limit_bonus.json",
        "text_tips.json",
        "text_ui.json",
        "text.json",
    ]

    print("=== GBFR Türkçe Zengin Açıklama Çeviri Motoru (Gelişmiş) Başlatılıyor ===")
    total_all = 0
    translated_all = 0
    results_summary = {}

    for fname in target_files:
        src_path = os.path.join(BACKUP_DIR, fname)
        dst_path = os.path.join(TARGET_DIR, fname)

        if not os.path.exists(src_path):
            print(f"[UYARI] {src_path} bulunamadı!")
            continue

        with open(src_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        if 'rows_' not in data:
            continue

        rows = data['rows_']
        total_rows = len(rows)
        trans_rows = 0

        for row in rows:
            col = row.get('column_', {})
            original = col.get('text_', '')
            if original:
                translated = translate_entry(original, fname)
                if translated != original:
                    col['text_'] = translated
                    trans_rows += 1

        # UTF-8 ve JSON Doğrulaması ile Hedefe Yaz
        with open(dst_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        # Doğrulama Testi
        with open(dst_path, 'r', encoding='utf-8') as f:
            verify_data = json.load(f)
        assert len(verify_data['rows_']) == total_rows, f"Hata: {fname} satır sayısı değişti!"

        results_summary[fname] = (total_rows, trans_rows)
        total_all += total_rows
        translated_all += trans_rows
        print(f"[BAŞARILI] {fname:24} -> Toplam: {total_rows:5} | Çevrilen: {trans_rows:5}")

    print("=" * 65)
    print(f"Genel Toplam Satır : {total_all}")
    print(f"Çevrilen Satır     : {translated_all}")
    print("Tüm dosyalar başarıyla güncellendi ve UTF-8 formatında doğrulandı.")
    return results_summary


if __name__ == '__main__':
    run_translation()
