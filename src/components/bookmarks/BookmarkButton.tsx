import { BOOKMARK_TOGGLE } from '../chat/styles';
import { toggleBookmark, useBookmarks, type Bookmark } from './useBookmarks';

/** Pass padding through `className`; the shared style leaves it out so the toggle can match neighboring pills. */
export default function BookmarkButton({ occupation, className }: { occupation: Bookmark; className: string }) {
	const saved = useBookmarks().some((b) => b.code === occupation.code);
	return (
		<button
			type="button"
			aria-pressed={saved}
			aria-label={`${saved ? 'Remove' : 'Save'} ${occupation.title} ${saved ? 'from' : 'to'} your comparison list`}
			onClick={() => toggleBookmark(occupation)}
			className={`${BOOKMARK_TOGGLE} ${className}`}
		>
			{saved ? '★ Saved' : '☆ Save to compare'}
		</button>
	);
}
