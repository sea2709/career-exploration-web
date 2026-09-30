import Markdown, { type Components } from 'react-markdown';

export default function MarkdownText({ text, components }: { text: string; components?: Components }) {
	return (
		<div className="space-y-3 leading-relaxed [&_a]:text-accent [&_a]:underline [&_a:hover]:text-accent-strong [&_hr]:border-line [&_h3]:font-display [&_h3]:font-semibold [&_strong]:font-bold [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6">
			<Markdown
				components={{
					a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
					...components,
				}}
			>
				{text}
			</Markdown>
		</div>
	);
}
