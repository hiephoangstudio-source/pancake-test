import { apiGet } from './api.js';

let _tagMap = null;

export async function loadTagClassifications() {
    if (_tagMap) return _tagMap;
    try {
        const tags = await apiGet('/tag-config');
        _tagMap = {};
        for (const t of tags) {
            _tagMap[t.tag_name.toLowerCase()] = t;
        }
        return _tagMap;
    } catch {
        return {};
    }
}

export function classifyTags(tags, tagMap) {
    const result = { branch: [], staff: [], lifecycle: [], service: [], location: [], unknown: [] };
    if (!tags || !Array.isArray(tags)) return result;
    for (const tag of tags) {
        const name = typeof tag === 'string' ? tag : (tag.name || tag.tag_name || '');
        if (!name) continue;
        const entry = tagMap[name.toLowerCase()];
        if (entry && result[entry.category]) {
            result[entry.category].push({ ...entry, originalName: name });
        } else {
            result.unknown.push({ tag_name: name, category: 'unknown', display_name: name, color: '#6B7280' });
        }
    }
    return result;
}

export function getBranch(tags, tagMap) {
    const classified = classifyTags(tags, tagMap);
    if (classified.branch.length > 0) {
        return classified.branch[0].display_name;
    }
    return 'Chưa phân loại';
}

export function getLifecycleStage(tags, tagMap) {
    const classified = classifyTags(tags, tagMap);
    const FUNNEL_ORDER = [
        'KH THAM KHẢO', 'KH TIỀM NĂNG', 'KH HẸN ĐẾN', 'KH HẸN ĐÃ ĐẾN',
        'KH KÝ ONLINE', 'KH KÍ OFFLINE', 'KH CHỌN GIÁ RẺ', 'KH MẤT',
        'VÃNG LAI', 'SAI ĐỐI TƯỢNG', 'khách cũ', 'Khách hội nhóm', 'KH kí tháng cũ'
    ];
    const last = classified.lifecycle
        .sort((a, b) => FUNNEL_ORDER.indexOf(b.tag_name) - FUNNEL_ORDER.indexOf(a.tag_name));
    return last.length > 0 ? last[0] : null;
}

export function getBranchTagNames(tagMap) {
    return Object.values(tagMap || {})
        .filter(t => t.category === 'branch' && t.is_active)
        .sort((a, b) => a.sort_order - b.sort_order);
}
