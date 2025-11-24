const ForeFoldLogo = ({ className = "h-8 w-8" }: { className?: string }) => {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="translate(60,60)">
        {/* Blue spinning wheel segments - recreating the exact ForeFold logo */}
        <path
          d="M 0,-40 L 30,-30 L 15,-15 L 0,-25 Z"
          fill="#4C1D95"
        />
        <path
          d="M 0,-40 L 30,-30 L 15,-15 L 0,-25 Z"
          fill="#4C1D95"
          transform="rotate(45)"
        />
        <path
          d="M 0,-40 L 30,-30 L 15,-15 L 0,-25 Z"
          fill="#4C1D95"
          transform="rotate(90)"
        />
        <path
          d="M 0,-40 L 30,-30 L 15,-15 L 0,-25 Z"
          fill="#4C1D95"
          transform="rotate(135)"
        />
        <path
          d="M 0,-40 L 30,-30 L 15,-15 L 0,-25 Z"
          fill="#4C1D95"
          transform="rotate(180)"
        />
        <path
          d="M 0,-40 L 30,-30 L 15,-15 L 0,-25 Z"
          fill="#4C1D95"
          transform="rotate(225)"
        />
        <path
          d="M 0,-40 L 30,-30 L 15,-15 L 0,-25 Z"
          fill="#4C1D95"
          transform="rotate(270)"
        />
        <path
          d="M 0,-40 L 30,-30 L 15,-15 L 0,-25 Z"
          fill="#4C1D95"
          transform="rotate(315)"
        />
      </g>
    </svg>
  );
};

export default ForeFoldLogo;