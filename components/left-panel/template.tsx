'use client'

interface Template {
  id: string
  name: string
  popular: boolean
}

const templates: Template[] = [
  { id: '1', name: 'Template Olahraga', popular: true },
  { id: '2', name: 'Template Korporat', popular: false },
  { id: '3', name: 'Template Event', popular: true },
  { id: '4', name: 'Template Casual', popular: false },
  { id: '5', name: 'Template Retro', popular: true },
  { id: '6', name: 'Template Minimalis', popular: false },
]

export default function TemplatePanel() {
  const handleApplyTemplate = (templateId: string, templateName: string) => {
    alert(`${templateName} diterapkan ke canvas!`)
  }

  return (
    <div className="p-4 space-y-4 flex flex-col h-full">
      {/* Templates Grid */}
      <div className="space-y-2 flex-1 overflow-y-auto">
        <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">
          Template Desain ({templates.length})
        </h3>

        <div className="grid grid-cols-2 gap-3">
          {templates.map(template => (
            <div
              key={template.id}
              onClick={() => handleApplyTemplate(template.id, template.name)}
              className="group cursor-pointer rounded-xl overflow-hidden border-2 border-gray-200 hover:border-blue-950 transition"
            >
              {/* Template Preview */}
              <div className="w-full aspect-square bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex flex-col items-center justify-center relative overflow-hidden group-hover:shadow-md transition">
                {/* Decorative elements */}
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-2 left-2 w-3 h-3 rounded-full bg-blue-950" />
                  <div className="absolute bottom-3 right-3 w-4 h-4 rounded-full bg-blue-950" />
                  <div className="absolute top-1/2 left-1/3 w-2 h-2 rounded-full bg-blue-950" />
                </div>

                <div className="relative text-4xl">📐</div>

                {/* Popular Badge */}
                {template.popular && (
                  <div className="absolute top-2 right-2 px-2 py-1 bg-blue-950 text-white text-[10px] font-semibold rounded-full">
                    Populer
                  </div>
                )}
              </div>

              {/* Template Name */}
              <div className="p-2 bg-white">
                <p className="text-xs font-medium text-gray-900 text-center truncate">
                  {template.name}
                </p>
              </div>

              {/* Hover Effect */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
