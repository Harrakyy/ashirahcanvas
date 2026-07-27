import { useState } from 'react'

export default function AddText() {
  const [text, setText] = useState('')
  const [fontSize, setFontSize] = useState(24)
  const [fontFamily, setFontFamily] = useState('sans')
  const [textColor, setTextColor] = useState('#000000')

  return (
    <div className="p-4 space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-900">Teks</label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Ketik teks kamu di sini"
          className="w-full mt-2 px-3 py-2 bg-white border-2 border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-950 focus:border-blue-950 transition"
          rows={3}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-900">Font Family</label>
        <select
          value={fontFamily}
          onChange={e => setFontFamily(e.target.value)}
          className="w-full mt-2 px-3 py-2 bg-white border-2 border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-950 focus:border-blue-950 transition cursor-pointer"
        >
          <option value="sans">Sans Serif</option>
          <option value="serif">Serif</option>
          <option value="mono">Monospace</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-900">
          Ukuran Font: {fontSize}px
        </label>
        <input
          type="range"
          min="12"
          max="72"
          value={fontSize}
          onChange={e => setFontSize(Number(e.target.value))}
          className="w-full mt-2"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-900">Warna Teks</label>
        <div className="mt-2 flex gap-3 items-center">
          <input
            type="color"
            value={textColor}
            onChange={e => setTextColor(e.target.value)}
            className="w-12 h-12 rounded-md border-2 border-gray-300 cursor-pointer focus:ring-2 focus:ring-blue-950 transition"
          />
          <input
            type="text"
            value={textColor}
            onChange={e => setTextColor(e.target.value)}
            className="px-3 py-2 bg-white border-2 border-gray-300 rounded-md text-sm text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-950 focus:border-blue-950 transition flex-1"
          />
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button className="flex-1 px-4 py-2 bg-blue-950 text-white rounded-lg text-sm hover:bg-blue-900 transition font-medium">
          Tambah Teks
        </button>
        <button className="flex-1 px-4 py-2 border-2 border-blue-950 text-blue-950 rounded-lg text-sm hover:bg-blue-50 transition font-medium">
          Simpan Template
        </button>
      </div>
    </div>
  )
}
