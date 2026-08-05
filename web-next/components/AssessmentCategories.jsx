'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { getCategoriesForPosition, scoreCategory } from '@/lib/assessmentFields'
import { AppSelect } from '@/components/ui/app-select'

function categoryAvg(scores, fields) {
  const values = fields.map(([key]) => Number(scores[key])).filter((v) => !isNaN(v) && v > 0)
  if (values.length === 0) return 0
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
}

/**
 * Same collapsible per-category score breakdown used by head-coach's
 * Penilaian page, reused read-only on the student's Rapor page so both
 * views show identical detail — not just the summary radar/gauge.
 *
 * `position` picks field-player vs GK criteria (see lib/assessmentFields).
 * `activeCategories` (array of category keys) is the coach's per-period
 * "actually grading this" selection — undefined means "everything active"
 * (legacy behavior, and the sensible default for a brand-new assessment).
 * In read-only mode an inactive category is omitted entirely rather than
 * shown grayed out, since the parent should only ever see what was scored.
 */
export default function AssessmentCategories({ scores, editable = false, onChange, position, activeCategories, onToggleCategory }) {
  const categories = getCategoriesForPosition(position)
  const [openCategory, setOpenCategory] = useState(categories[0]?.key)
  const isActive = (key) => activeCategories === undefined || activeCategories.includes(key)
  const visibleCategories = editable ? categories : categories.filter((cat) => isActive(cat.key))

  return (
    <>
      {visibleCategories.map((cat) => {
        const isOpen = openCategory === cat.key
        const active = isActive(cat.key)
        const avg = categoryAvg(scores, cat.fields)
        return (
          <div key={cat.key} className={`glass-card rounded-3xl overflow-hidden ${editable && !active ? 'opacity-60' : ''}`}>
            <div className="w-full flex items-center justify-between gap-3 p-5">
              <div className="flex items-center gap-3 min-w-0">
                {editable && (
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => { e.stopPropagation(); onToggleCategory?.(cat.key) }}
                    className="rounded shrink-0"
                    title="Nilai kategori ini periode ini"
                  />
                )}
                <button
                  type="button"
                  onClick={() => setOpenCategory((k) => (k === cat.key ? null : cat.key))}
                  className="flex items-center gap-3 min-w-0 text-left"
                >
                  <h2 className="font-semibold text-navy-900 text-sm truncate">{cat.title}</h2>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setOpenCategory((k) => (k === cat.key ? null : cat.key))}
                className="flex items-center gap-3 shrink-0"
              >
                <span className="text-sm font-bold text-gold-600 tabular-nums">{avg > 0 ? avg : '-'}</span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
            {isOpen && (
              <fieldset disabled={editable && !active} className="px-5 pb-5 grid sm:grid-cols-2 gap-3">
                {cat.fields.map(([key, label]) => {
                  const val = scores[key]
                  const cat2 = val !== '' && val !== undefined && val !== null ? scoreCategory(Number(val)) : null
                  return (
                    <div key={key} className="flex items-center justify-between gap-3">
                      <label className="text-sm text-gray-600">{label}</label>
                      <div className="flex items-center gap-2">
                        {editable ? (
                          <AppSelect
                            value={val === undefined || val === '' ? '' : String(val)}
                            onChange={(v) => onChange((s) => ({ ...s, [key]: v }))}
                            allLabel="-"
                            placeholder="-"
                            className="w-16 py-1.5 px-2.5 justify-center"
                            options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({ value: String(n), label: String(n) }))}
                          />
                        ) : (
                          <span className="w-16 text-center text-sm font-semibold text-navy-900 tabular-nums">{val || '-'}</span>
                        )}
                        {cat2 && <span className={`text-xs font-semibold w-20 ${cat2.color}`}>{cat2.label}</span>}
                      </div>
                    </div>
                  )
                })}
              </fieldset>
            )}
          </div>
        )
      })}
    </>
  )
}
