export default function SelectPills({
  options = [],
  value,
  onChange,
  getLabel = (o) => o.label ?? o,
  getValue = (o) => o.value ?? o,
  disabled = false,
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {options.map((option) => {
        const optionValue = getValue(option);
        const isActive = optionValue === value;

        return (
          <button
            key={optionValue}
            type="button"
            disabled={disabled}
            onClick={() => onChange(optionValue)}
            className={`
              px-4 py-2 rounded-full border text-sm transition
              ${
                isActive
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-transparent text-blue-300 border-blue-500 hover:bg-blue-500/10"
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : ""}
            `}
          >
            {getLabel(option)}
          </button>
        );
      })}
    </div>
  );
}
