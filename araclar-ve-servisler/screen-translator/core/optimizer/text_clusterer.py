from typing import List
try:
    from core.interfaces.ocr_base import TextBlock
except ImportError:
    from ..interfaces.ocr_base import TextBlock

class TextClusterer:
    """
    Ekrandaki dağınık veya alt alta gelen satırları bağlamsal olarak
    mantıksal paragraflara birleştirir.
    Bu işlem:
    1. Yapay Zekaya tam cümle bağlamı vererek çeviri kalitesini katbekat artırır.
    2. API'ye giden istek sayısını ve gecikmeyi dramatik ölçüde düşürür.
    """

    def __init__(self, vertical_threshold_ratio: float = 1.5, horizontal_overlap_ratio: float = 0.5):
        self.vertical_threshold_ratio = vertical_threshold_ratio
        self.horizontal_overlap_ratio = horizontal_overlap_ratio

    def cluster_blocks(self, blocks: List[TextBlock]) -> List[TextBlock]:
        """
        Birbirine yakın ve aynı sütundaki metin bloklarını birleştirir.
        Tek satırlık kısa başlıklar veya menüler ise ayrık bırakılır.
        """
        if not blocks or len(blocks) <= 1:
            return blocks

        # Y koordinatına göre yukarıdan aşağıya sırala
        sorted_blocks = sorted(blocks, key=lambda b: (b.y, b.x))
        clustered: List[TextBlock] = []
        
        current_cluster: List[TextBlock] = [sorted_blocks[0]]

        for i in range(1, len(sorted_blocks)):
            prev = current_cluster[-1]
            curr = sorted_blocks[i]

            # Dikey mesafe kontrolü
            avg_height = (prev.height + curr.height) / 2.0
            vertical_gap = curr.y - prev.bottom
            is_vertically_close = -5 <= vertical_gap <= (avg_height * self.vertical_threshold_ratio)

            # Yatay hizalanma kontrolü (Sol kenar veya çakışma)
            horizontal_overlap = max(0, min(prev.right, curr.right) - max(prev.x, curr.x))
            min_width = min(prev.width, curr.width)
            is_horizontally_aligned = (
                abs(prev.x - curr.x) < 30 or 
                (min_width > 0 and (horizontal_overlap / min_width) >= self.horizontal_overlap_ratio)
            )

            # Satır sonu noktalama kontrolü: Eğer önceki satır nokta/ünlem/soru işaretiyle bitmiyorsa birleştirmeye çok daha uygundur
            ends_sentence = prev.text.strip().endswith(('.', '!', '?', ':'))

            if is_vertically_close and is_horizontally_aligned and not ends_sentence:
                current_cluster.append(curr)
            else:
                # Mevcut kümeyi tek bir blokta topla
                clustered.append(self._merge_cluster(current_cluster))
                current_cluster = [curr]

        if current_cluster:
            clustered.append(self._merge_cluster(current_cluster))

        return clustered

    def _merge_cluster(self, cluster: List[TextBlock]) -> TextBlock:
        if len(cluster) == 1:
            return cluster[0]

        merged_text = " ".join(b.text.strip() for b in cluster)
        min_x = min(b.x for b in cluster)
        min_y = min(b.y for b in cluster)
        max_x = max(b.right for b in cluster)
        max_y = max(b.bottom for b in cluster)
        avg_confidence = sum(b.confidence for b in cluster) / len(cluster)

        return TextBlock(
            text=merged_text,
            x=min_x,
            y=min_y,
            width=max_x - min_x,
            height=max_y - min_y,
            confidence=avg_confidence
        )
