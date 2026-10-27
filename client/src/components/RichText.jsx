// Renders text with **bold** markers as <strong> elements.
export default function RichText({ text, as: Tag = 'p', className }) {
  const parts = text.split(/(\*\*.+?\*\*)/g)
  return (
    <Tag className={className}>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={i}>{part.slice(2, -2)}</strong>
        ) : (
          part
        ),
      )}
    </Tag>
  )
}
