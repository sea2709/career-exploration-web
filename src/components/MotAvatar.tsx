const SIZES = {
	sm: { box: 'size-8', icon: 22 },
	md: { box: 'size-10', icon: 28 },
	lg: { box: 'size-22', icon: 58 },
};

/** Mot, the site's mascot: a purple blob with a smiling face. */
export default function MotAvatar({
	size = 'md',
	animated = false,
}: {
	size?: keyof typeof SIZES;
	animated?: boolean;
}) {
	const { box, icon } = SIZES[size];
	const motion = animated ? 'motion-safe:animate-blob-morph' : '';
	const blink = animated ? 'origin-center [transform-box:fill-box] motion-safe:animate-mot-blink' : '';
	return (
		<div aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-blob bg-accent ${motion} ${box}`}>
			<svg width={icon} height={icon} viewBox="0 0 24 24" fill="none">
				<g className={blink}>
					<circle cx="8.5" cy="10.5" r="1.7" fill="#FFFFFF" />
					<circle cx="15.5" cy="10.5" r="1.7" fill="#FFFFFF" />
				</g>
				<path
					d="M9 15c.9 1.1 1.9 1.6 3 1.6s2.1-.5 3-1.6"
					stroke="#FFFFFF"
					strokeWidth="1.7"
					strokeLinecap="round"
				/>
			</svg>
		</div>
	);
}
