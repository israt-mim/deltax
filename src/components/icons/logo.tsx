export const Logo = ({ size=100, primaryColor = 'currentColor', secondaryColor = 'crrentColor' }) => {
	return (
		<svg width={size} height={size/3} viewBox="0 0 100 40" xmlns="http://www.w3.org/2000/svg">
			<text x="0" y="31" font-family="Pacifico, cursive" font-size="40" fill={primaryColor}>δ</text>

			<text x="22" y="31" font-family="Arial, sans-serif" font-size="30" fill={primaryColor}>elta</text>

			<text x="70" y="32" font-family="Arial, sans-serif" fontWeight={600} font-size="30" fill={secondaryColor}>X</text>
		</svg>
	)
}