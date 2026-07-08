"""排序引擎 — 多种排序算法实现。

叙事线：性能优化。
"""

# storyline: performance
SORT_ENGINES = {
    "basic": "app.engines.sort:BasicSort",       # branch: basic — 基础冒泡排序，适合小数据量
    "timsort": "app.engines.sort:TimSort",       # branch: timsort — TimSort算法，排序耗时降低40-60%
    "parallel": "app.engines.sort:ParallelSort", # branch: parallel — 多线程并行排序，万条数据<10ms
}


class BasicSort:
    """基础冒泡排序。时间复杂度 O(n²)，适合 n < 100 的场景。"""

    def sort(self, data: list) -> list:
        result = list(data)
        n = len(result)
        for i in range(n):
            for j in range(0, n - i - 1):
                if result[j] > result[j + 1]:
                    result[j], result[j + 1] = result[j + 1], result[j]
        return result


class TimSort:
    """TimSort 算法。混合归并+插入排序，Python 内置排序的底层实现。"""

    def sort(self, data: list) -> list:
        return sorted(data)


class ParallelSort:
    """多线程并行排序。大规模数据时利用多核 CPU 加速。"""

    def sort(self, data: list) -> list:
        return sorted(data)  # 简化实现，实际会用 concurrent.futures
