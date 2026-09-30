import type { ReactNode } from 'react';
import MotAvatar from '../MotAvatar';

/** An assistant turn: Mot's avatar and name beside a column of bubbles, cards, and chips. */
export function MotMessage({ children }: { children: ReactNode }) {
	return (
		<div className="flex items-start gap-3">
			<MotAvatar />
			<div className="flex min-w-0 flex-1 flex-col gap-2.5">
				<div className="text-[13px] font-bold text-ink">Mot</div>
				<div className="flex flex-col items-start gap-2.5">{children}</div>
			</div>
		</div>
	);
}

export function MotBubble({ children }: { children: ReactNode }) {
	return (
		<div className="max-w-full self-stretch rounded-[22px] border border-line bg-white px-[18px] py-3.5 shadow-bubble first:rounded-tl-md">
			{children}
		</div>
	);
}

export function UserMessage({ children }: { children: ReactNode }) {
	return (
		<div className="flex justify-end">
			<div className="max-w-[85%] whitespace-pre-wrap rounded-[22px] rounded-tr-md bg-accent px-[18px] py-3 text-white">
				{children}
			</div>
		</div>
	);
}

export function ThinkingMessage() {
	return (
		<MotMessage>
			<p className="text-sm text-ink-muted">Thinking…</p>
		</MotMessage>
	);
}

export function ErrorNote({ message }: { message?: string }) {
	return <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{message || 'Something went wrong.'}</p>;
}
