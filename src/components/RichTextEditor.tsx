 import { useEditor, EditorContent } from "@tiptap/react";
 import StarterKit from "@tiptap/starter-kit";
 import Link from "@tiptap/extension-link";
 import Image from "@tiptap/extension-image";
 import TextAlign from "@tiptap/extension-text-align";
 import Underline from "@tiptap/extension-underline";
 import { TextStyle } from "@tiptap/extension-text-style";
 import Color from "@tiptap/extension-color";
 import { useEffect } from "react";
 import {
   Bold,
   Italic,
   Underline as UnderlineIcon,
   Strikethrough,
   List,
   ListOrdered,
   AlignLeft,
   AlignCenter,
   AlignRight,
   AlignJustify,
   Link as LinkIcon,
   Image as ImageIcon,
   Heading1,
   Heading2,
   Heading3,
   Quote,
   Code,
   Undo,
   Redo,
 } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { cn } from "@/lib/utils";
 
 interface RichTextEditorProps {
   content: string;
   onChange: (content: string) => void;
   placeholder?: string;
   className?: string;
 }
 
 export const RichTextEditor = ({ content, onChange, placeholder, className }: RichTextEditorProps) => {
   const editor = useEditor({
     extensions: [
       StarterKit.configure({
         heading: {
           levels: [1, 2, 3],
         },
       }),
       Link.configure({
         openOnClick: false,
         HTMLAttributes: {
           class: "text-primary underline",
         },
       }),
       Image,
       TextAlign.configure({
         types: ["heading", "paragraph"],
       }),
       Underline,
       TextStyle,
       Color,
     ],
     content: content,
     editorProps: {
       attributes: {
         class: cn(
           "prose prose-sm dark:prose-invert max-w-none min-h-[200px] p-4 focus:outline-none",
           "border border-input rounded-b-md bg-background"
         ),
       },
     },
     onUpdate: ({ editor }) => {
       onChange(editor.getHTML());
     },
   });
 
   useEffect(() => {
     if (editor && content !== editor.getHTML()) {
       editor.commands.setContent(content);
     }
   }, [content, editor]);
 
   if (!editor) return null;
 
   const addLink = () => {
     const url = window.prompt("Enter URL:");
     if (url) {
       editor.chain().focus().setLink({ href: url }).run();
     }
   };
 
   const addImage = () => {
     const url = window.prompt("Enter image URL:");
     if (url) {
       editor.chain().focus().setImage({ src: url }).run();
     }
   };
 
   const ToolbarButton = ({
     onClick,
     isActive,
     children,
     title,
   }: {
     onClick: () => void;
     isActive?: boolean;
     children: React.ReactNode;
     title: string;
   }) => (
     <Button
       type="button"
       variant="ghost"
       size="icon"
       className={cn("h-8 w-8", isActive && "bg-muted")}
       onClick={onClick}
       title={title}
     >
       {children}
     </Button>
   );
 
   return (
     <div className={cn("border border-input rounded-md overflow-hidden", className)}>
       {/* Toolbar */}
       <div className="flex flex-wrap gap-1 p-2 bg-muted/50 border-b border-input">
         {/* Undo/Redo */}
         <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo">
           <Undo className="w-4 h-4" />
         </ToolbarButton>
         <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo">
           <Redo className="w-4 h-4" />
         </ToolbarButton>
 
         <div className="w-px h-6 bg-border mx-1 self-center" />
 
         {/* Headings */}
         <ToolbarButton
           onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
           isActive={editor.isActive("heading", { level: 1 })}
           title="Heading 1"
         >
           <Heading1 className="w-4 h-4" />
         </ToolbarButton>
         <ToolbarButton
           onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
           isActive={editor.isActive("heading", { level: 2 })}
           title="Heading 2"
         >
           <Heading2 className="w-4 h-4" />
         </ToolbarButton>
         <ToolbarButton
           onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
           isActive={editor.isActive("heading", { level: 3 })}
           title="Heading 3"
         >
           <Heading3 className="w-4 h-4" />
         </ToolbarButton>
 
         <div className="w-px h-6 bg-border mx-1 self-center" />
 
         {/* Text formatting */}
         <ToolbarButton
           onClick={() => editor.chain().focus().toggleBold().run()}
           isActive={editor.isActive("bold")}
           title="Bold"
         >
           <Bold className="w-4 h-4" />
         </ToolbarButton>
         <ToolbarButton
           onClick={() => editor.chain().focus().toggleItalic().run()}
           isActive={editor.isActive("italic")}
           title="Italic"
         >
           <Italic className="w-4 h-4" />
         </ToolbarButton>
         <ToolbarButton
           onClick={() => editor.chain().focus().toggleUnderline().run()}
           isActive={editor.isActive("underline")}
           title="Underline"
         >
           <UnderlineIcon className="w-4 h-4" />
         </ToolbarButton>
         <ToolbarButton
           onClick={() => editor.chain().focus().toggleStrike().run()}
           isActive={editor.isActive("strike")}
           title="Strikethrough"
         >
           <Strikethrough className="w-4 h-4" />
         </ToolbarButton>
 
         <div className="w-px h-6 bg-border mx-1 self-center" />
 
         {/* Lists */}
         <ToolbarButton
           onClick={() => editor.chain().focus().toggleBulletList().run()}
           isActive={editor.isActive("bulletList")}
           title="Bullet List"
         >
           <List className="w-4 h-4" />
         </ToolbarButton>
         <ToolbarButton
           onClick={() => editor.chain().focus().toggleOrderedList().run()}
           isActive={editor.isActive("orderedList")}
           title="Numbered List"
         >
           <ListOrdered className="w-4 h-4" />
         </ToolbarButton>
 
         <div className="w-px h-6 bg-border mx-1 self-center" />
 
         {/* Alignment */}
         <ToolbarButton
           onClick={() => editor.chain().focus().setTextAlign("left").run()}
           isActive={editor.isActive({ textAlign: "left" })}
           title="Align Left"
         >
           <AlignLeft className="w-4 h-4" />
         </ToolbarButton>
         <ToolbarButton
           onClick={() => editor.chain().focus().setTextAlign("center").run()}
           isActive={editor.isActive({ textAlign: "center" })}
           title="Align Center"
         >
           <AlignCenter className="w-4 h-4" />
         </ToolbarButton>
         <ToolbarButton
           onClick={() => editor.chain().focus().setTextAlign("right").run()}
           isActive={editor.isActive({ textAlign: "right" })}
           title="Align Right"
         >
           <AlignRight className="w-4 h-4" />
         </ToolbarButton>
         <ToolbarButton
           onClick={() => editor.chain().focus().setTextAlign("justify").run()}
           isActive={editor.isActive({ textAlign: "justify" })}
           title="Justify"
         >
           <AlignJustify className="w-4 h-4" />
         </ToolbarButton>
 
         <div className="w-px h-6 bg-border mx-1 self-center" />
 
         {/* Block elements */}
         <ToolbarButton
           onClick={() => editor.chain().focus().toggleBlockquote().run()}
           isActive={editor.isActive("blockquote")}
           title="Quote"
         >
           <Quote className="w-4 h-4" />
         </ToolbarButton>
         <ToolbarButton
           onClick={() => editor.chain().focus().toggleCodeBlock().run()}
           isActive={editor.isActive("codeBlock")}
           title="Code Block"
         >
           <Code className="w-4 h-4" />
         </ToolbarButton>
 
         <div className="w-px h-6 bg-border mx-1 self-center" />
 
         {/* Link & Image */}
         <ToolbarButton onClick={addLink} isActive={editor.isActive("link")} title="Add Link">
           <LinkIcon className="w-4 h-4" />
         </ToolbarButton>
         <ToolbarButton onClick={addImage} title="Add Image">
           <ImageIcon className="w-4 h-4" />
         </ToolbarButton>
       </div>
 
       {/* Editor Content */}
       <EditorContent editor={editor} />
     </div>
   );
 };