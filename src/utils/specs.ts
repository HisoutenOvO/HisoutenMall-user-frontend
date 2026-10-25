// src/utils/specs.ts

export interface SpecItem {
    key: string
    value: string
}

/**
 * 将后端的 JSON 规格字符串解析为对象数组（方便用 el-tag 或循环渲染）
 * 例：{"颜色":"土豪金","内存":"24G"} -> [{ key: '颜色', value: '土豪金' }, { key: '内存', value: '24G' }]
 */
export function parseSkuSpecs(specs: string | undefined | null): SpecItem[] {
    if (!specs) return []
    try {
        const obj = JSON.parse(specs)
        // 确保解析出来的是普通对象，而不是数组或 null
        if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
            return Object.entries(obj).map(([key, value]) => ({
                key,
                value: String(value)
            }))
        }
        return []
    } catch (e) {
        // 兼容历史遗留的非 JSON 格式数据（如：直接存的 "红色 64G"）
        return [{ key: '规格', value: specs }]
    }
}

/**
 * 将后端的 JSON 规格字符串直接解析为可读的字符串
 * 例：{"颜色":"土豪金","内存":"24G"} -> "颜色: 土豪金 / 内存: 24G"
 */
export function formatSkuSpecs(specs: string | undefined | null): string {
    const items = parseSkuSpecs(specs)
    // 如果解析失败直接返回原字符串（兼容老数据）
    // @ts-ignore
    if (items.length === 1 && items[0].key === '规格') {
        // @ts-ignore
        return items[0].value
    }
    return items.map(item => `${item.key}: ${item.value}`).join(' / ')
}