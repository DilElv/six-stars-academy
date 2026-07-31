'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { ASSESSMENT_CATEGORIES, scoreCategory } from '@/lib/assessmentFields'
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
 */
export default function AssessmentCategories({ scores, editable = false, onChange }) {
  const [openCategory, setOpenCategory] = useState(ASSESSMENT_CATEGORIES[0]?.key)

  return (
    <>
      {ASSESSMENT_CATEGORIES.map((cat) => {
        const isOpen = openCategory === cat.key
        const avg = categoryAvg(scores, cat.fields)
        return (
          <div key={cat.key} className="glass-card rounded-3xl overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenCategory((k) => (k === cat.key ? null : cat.key))}
              className="w-full flex items-center justify-between gap-3 p-5"
            >
              <h2 className="font-semibold text-navy-900 text-sm">{cat.title}</h2>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-gold-600 tabular-nums">{avg > 0 ? avg : '-'}</span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>
            {isOpen && (
              <div className="px-5 pb-5 grid sm:grid-cols-2 gap-3">
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
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}
