// Fila de "etiqueta + valor" que en modo edición muestra el editor recibido.
export function EditField({ label, value, editMode, editor }: {
  label: string
  value: string
  editMode: boolean
  editor: React.ReactNode
}) {
  return (
    <div className="py-2.5 border-b border-slate-100 dark:border-slate-800">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">{label}</span>
      {editMode && editor ? editor : (
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{value}</span>
      )}
    </div>
  )
}
