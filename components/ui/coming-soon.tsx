interface ComingSoonProps {
  title?: string
  description?: string
}

export function ComingSoon({
  title = 'Segera Hadir',
  description = 'Fitur ini sedang kami kembangkan dan akan segera tersedia untuk kamu.',
}: ComingSoonProps) {
  return (
    <div className="p-4 flex flex-col items-center justify-center h-full text-center gap-1">
      <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-[11px] font-semibold uppercase tracking-wide">
        {title}
      </span>
      <p className="text-sm text-gray-500 max-w-[16rem]">{description}</p>
    </div>
  )
}
