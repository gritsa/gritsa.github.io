import React, { useEffect } from 'react';
import { Box, Button, HStack, Wrap, WrapItem } from '@chakra-ui/react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import './policy-editor.css';

interface PolicyEditorProps {
  content: string;
  onChange: (html: string) => void;
}

const ToolbarButton: React.FC<{ active?: boolean; onClick: () => void; children: React.ReactNode; label: string }> = ({
  active,
  onClick,
  children,
  label,
}) => (
  <Button
    size="xs"
    aria-label={label}
    onClick={onClick}
    variant={active ? 'solid' : 'ghost'}
    colorScheme={active ? 'brand' : undefined}
    color="white"
  >
    {children}
  </Button>
);

/** Rich text editor for policy content, built on Tiptap. Outputs/accepts HTML. */
const PolicyEditor: React.FC<PolicyEditorProps> = ({ content, onChange }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: 'Write the policy text here…' }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Only resets when `content` diverges from the editor's own last-emitted HTML (i.e. an
  // external change, like switching which policy is being edited) — not on every keystroke,
  // since onUpdate already keeps the parent's `content` in sync with editor.getHTML().
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  const setLink = () => {
    const previousUrl = editor?.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL', previousUrl || 'https://');
    if (url === null) return;
    if (url === '') {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  if (!editor) return null;

  return (
    <Box borderRadius="md" border="1px solid" borderColor="whiteAlpha.300" overflow="hidden">
      <Wrap spacing={1} p={2} bg="whiteAlpha.50" borderBottom="1px solid" borderColor="whiteAlpha.200">
        <WrapItem>
          <HStack spacing={1}>
            <ToolbarButton label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
              <strong>B</strong>
            </ToolbarButton>
            <ToolbarButton label="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
              <em>I</em>
            </ToolbarButton>
            <ToolbarButton label="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
              <span style={{ textDecoration: 'underline' }}>U</span>
            </ToolbarButton>
            <ToolbarButton label="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
              <span style={{ textDecoration: 'line-through' }}>S</span>
            </ToolbarButton>
          </HStack>
        </WrapItem>
        <WrapItem>
          <HStack spacing={1}>
            <ToolbarButton label="Heading 1" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
              H1
            </ToolbarButton>
            <ToolbarButton label="Heading 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
              H2
            </ToolbarButton>
            <ToolbarButton label="Heading 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
              H3
            </ToolbarButton>
          </HStack>
        </WrapItem>
        <WrapItem>
          <HStack spacing={1}>
            <ToolbarButton label="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
              • List
            </ToolbarButton>
            <ToolbarButton label="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
              1. List
            </ToolbarButton>
            <ToolbarButton label="Blockquote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
              " Quote
            </ToolbarButton>
            <ToolbarButton label="Horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
              — HR
            </ToolbarButton>
          </HStack>
        </WrapItem>
        <WrapItem>
          <HStack spacing={1}>
            <ToolbarButton label="Link" active={editor.isActive('link')} onClick={setLink}>
              Link
            </ToolbarButton>
            <ToolbarButton label="Undo" onClick={() => editor.chain().focus().undo().run()}>
              Undo
            </ToolbarButton>
            <ToolbarButton label="Redo" onClick={() => editor.chain().focus().redo().run()}>
              Redo
            </ToolbarButton>
          </HStack>
        </WrapItem>
      </Wrap>
      <Box px={4} py={3} minH="250px" maxH="450px" overflowY="auto" bg="whiteAlpha.50" color="white">
        <EditorContent editor={editor} />
      </Box>
    </Box>
  );
};

export default PolicyEditor;
