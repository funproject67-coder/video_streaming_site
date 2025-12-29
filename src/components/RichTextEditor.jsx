/* eslint-disable react/prop-types */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Typography from "@tiptap/extension-typography";
import CharacterCount from "@tiptap/extension-character-count";
import { createPortal } from "react-dom";
import { debounce } from "lodash";
import { Maximize2, Minimize2, Undo2, Redo2 } from "lucide-react";

// --- ICONS (Unified SVG Set) ---
const Icons = {
  Bold: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path></svg>,
  Italic: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4"></line><line x1="14" y1="20" x2="5" y2="20"></line><line x1="15" y1="4" x2="9" y2="20"></line></svg>,
  Strike: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.3 19c-1.4 1.4-3.4 2-5.3 2A7 7 0 0 1 5 12a7 7 0 0 1 1.7-4.5"></path><path d="M13.7 5c1.4-1.4 3.4-2 5.3-2A7 7 0 0 1 20.3 8"></path><line x1="4" y1="12" x2="20" y2="12"></line></svg>,
  Code: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>,
  Link: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>,
  ListBullet: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>,
  ListOrdered: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="6" x2="21" y2="6"></line><line x1="10" y1="12" x2="21" y2="12"></line><line x1="10" y1="18" x2="21" y2="18"></line><path d="M4 6h1v4"></path><path d="M4 10h2"></path><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path></svg>,
  ListCheck: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>,
  Quote: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path></svg>,
  Image: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>,
  Divider: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="12" x2="20" y2="12"></line></svg>,
  H1: () => <span className="font-black text-[10px] font-serif tracking-tighter">H1</span>,
  H2: () => <span className="font-bold text-[10px] font-serif tracking-tighter">H2</span>,
  H3: () => <span className="font-medium text-[10px] font-serif tracking-tighter">H3</span>,
};

// --- TOOLBTN ---
const ToolBtn = React.memo(({ onClick, isActive, icon: Icon, title, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`p-2 rounded-lg transition-all flex items-center justify-center min-w-[32px] ${
      disabled ? "opacity-20 cursor-not-allowed text-slate-500" :
      isActive 
        ? "bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)]" 
        : "text-slate-400 hover:text-white hover:bg-white/10 active:scale-95"
    }`}
  >
    <Icon />
  </button>
));

const VerticalDivider = () => <div className="w-px h-4 bg-white/10 mx-1 flex-shrink-0" />;

// --- EDITOR UI ---
const EditorUI = React.memo(({ editor, viewMode, setViewMode, isFullscreen, setIsFullscreen, minHeight, previewContent }) => {
  if (!editor) return null;

  const renderTool = (action, isActive, Icon, title) => (
    <ToolBtn onClick={() => editor.chain().focus()[action]().run()} isActive={editor.isActive(isActive)} icon={Icon} title={title} />
  );

  const addImage = () => {
    const url = window.prompt('Image URL');
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  const addLink = () => {
    const url = window.prompt('Link URL');
    if (url) editor.chain().focus().setLink({ href: url }).run();
  };

  return (
    <div className={`flex flex-col h-full bg-[#020617] ${isFullscreen ? 'p-6' : 'rounded-2xl border border-white/5 bg-slate-900/40 overflow-hidden shadow-2xl'}`}>
        
        {/* RIBBON TOOLBAR */}
        <div className={`flex flex-col border border-white/5 bg-white/[0.03] backdrop-blur-2xl flex-shrink-0 ${isFullscreen ? 'rounded-2xl mb-4' : 'border-x-0 border-t-0'}`}>
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-black/40">
                 <div className="flex items-center gap-3">
                    <div className="flex bg-black/40 rounded-xl p-1 border border-white/5 shadow-inner">
                        <button onClick={() => setViewMode('write')} className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] rounded-lg transition-all ${viewMode === 'write' ? 'bg-emerald-500/10 text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Write</button>
                        <button onClick={() => setViewMode('split')} className={`hidden md:block px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] rounded-lg transition-all ${viewMode === 'split' ? 'bg-emerald-500/10 text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Split</button>
                        <button onClick={() => setViewMode('preview')} className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] rounded-lg transition-all ${viewMode === 'preview' ? 'bg-emerald-500/10 text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Preview</button>
                    </div>
                 </div>
                 <button onClick={() => setIsFullscreen(!isFullscreen)} className="text-slate-500 hover:text-white flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/5">
                    {isFullscreen ? <><Minimize2 size={14}/> Exit Zen</> : <><Maximize2 size={14}/> Zen Mode</>}
                 </button>
            </div>

            <div className="flex flex-wrap items-center px-4 py-2 gap-1.5 overflow-x-auto no-scrollbar">
                <ToolBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} icon={Undo2} title="Undo" />
                <ToolBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} icon={Redo2} title="Redo" />
                <VerticalDivider />
                {renderTool('toggleBold', 'bold', Icons.Bold, 'Bold')}
                {renderTool('toggleItalic', 'italic', Icons.Italic, 'Italic')}
                {renderTool('toggleStrike', 'strike', Icons.Strike, 'Strike')}
                {renderTool('toggleCode', 'code', Icons.Code, 'Inline Code')}
                <VerticalDivider />
                <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} icon={Icons.H1} title="H1" />
                <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} icon={Icons.H2} title="H2" />
                <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} icon={Icons.H3} title="H3" />
                <VerticalDivider />
                {renderTool('toggleBulletList', 'bulletList', Icons.ListBullet, 'Bullets')}
                {renderTool('toggleOrderedList', 'orderedList', Icons.ListOrdered, 'Ordered')}
                {renderTool('toggleTaskList', 'taskList', Icons.ListCheck, 'Tasks')}
                <VerticalDivider />
                {renderTool('toggleBlockquote', 'blockquote', Icons.Quote, 'Quote')}
                {renderTool('setHorizontalRule', '', Icons.Divider, 'Divider')}
                <ToolBtn onClick={addLink} isActive={editor.isActive('link')} icon={Icons.Link} title="Link" />
                <ToolBtn onClick={addImage} isActive={false} icon={Icons.Image} title="Image" />
            </div>
        </div>

        {/* EDITOR AREA */}
        <div className={`flex-1 flex min-h-0 relative ${isFullscreen ? 'bg-slate-900/20 rounded-3xl border border-white/5' : ''} ${!isFullscreen ? minHeight : ''}`}>
            <div className={`flex-1 flex flex-col min-w-0 ${viewMode === 'preview' ? 'hidden' : 'block'}`}>
                <EditorContent editor={editor} className="flex-1 overflow-y-auto custom-scrollbar p-8 h-full" />
            </div>

            {viewMode === 'split' && <div className="w-px bg-white/5 flex-shrink-0" />}

            <div className={`flex-1 h-full min-w-0 bg-black/20 overflow-y-auto custom-scrollbar p-8 ${viewMode === 'write' ? 'hidden' : 'block'}`}>
                <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed [&>*:first-child]:mt-0 font-serif">
                    <div dangerouslySetInnerHTML={{ __html: previewContent || '<p class="text-slate-600 italic opacity-50">Drafting...</p>' }} />
                </div>
            </div>
        </div>

        {/* STATUS FOOTER */}
        {!isFullscreen && (
            <div className="bg-black/40 border-t border-white/5 px-6 py-2 flex justify-between text-[10px] text-slate-500 font-black tracking-widest uppercase flex-shrink-0">
                <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)]" /> {editor?.storage?.characterCount?.words?.() || 0} words</span>
                <span className="opacity-40 tracking-[0.3em]">Engine v2.0</span>
            </div>
        )}
    </div>
  );
});

// --- MAIN WRAPPER ---
export default function RichTextEditor({ content, onChange, placeholder = "Start typing...", minHeight = "h-64", storageKey }) {
  const [viewMode, setViewMode] = useState("write");
  const [isZen, setIsZen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [previewContent, setPreviewContent] = useState(content || "");

  const extensions = useMemo(() => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: { HTMLAttributes: { class: "bg-black/60 p-6 rounded-2xl font-mono text-sm my-6 border border-white/5 shadow-inner" } },
        bulletList: { HTMLAttributes: { class: "list-disc list-outside ml-6 space-y-2" } },
        orderedList: { HTMLAttributes: { class: "list-decimal list-outside ml-6 space-y-2" } },
        blockquote: { HTMLAttributes: { class: "border-l-2 border-emerald-500/40 pl-6 py-2 my-8 bg-emerald-500/5 italic text-slate-300 rounded-r-2xl" } },
        horizontalRule: { HTMLAttributes: { class: "border-t border-white/10 my-8" } },
      }),
      Image.configure({ HTMLAttributes: { class: "rounded-3xl border border-white/10 shadow-2xl max-w-full my-8 mx-auto" } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-emerald-400 decoration-emerald-500/30 underline underline-offset-4 cursor-pointer" } }),
      TaskList.configure({ HTMLAttributes: { class: "space-y-3 my-4" } }),
      TaskItem.configure({ nested: true, HTMLAttributes: { class: "flex gap-4 items-start" } }),
      Placeholder.configure({ placeholder }),
      Typography,
      CharacterCount,
  ], [placeholder]);

  const debouncedSync = useMemo(() => debounce((html, json) => {
      onChange(html); 
      if (storageKey) localStorage.setItem(storageKey, JSON.stringify(json));
  }, 1000), [onChange, storageKey]);

  const editor = useEditor({
    extensions,
    content: content || (storageKey ? JSON.parse(localStorage.getItem(storageKey)) : ""),
    editorProps: {
      attributes: {
        class: "prose prose-invert prose-base max-w-none focus:outline-none min-h-[150px] text-slate-200 leading-[1.8] outline-none border-none h-full selection:bg-emerald-500/20",
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setPreviewContent(html); 
      debouncedSync(html, editor.getJSON()); 
    },
  }, [extensions]);

  useEffect(() => {
    if (editor && content === "" && editor.getHTML() !== "<p></p>") {
      editor.commands.setContent("");
      setPreviewContent("");
    } else if (editor && content && content !== "<p></p>" && (editor.isEmpty || editor.getHTML() === "<p></p>")) {
      editor.commands.setContent(content);
      setPreviewContent(content);
    }
  }, [content, editor]);

  useEffect(() => {
    setIsMounted(true);
    return () => debouncedSync.cancel();
  }, [debouncedSync]);

  if (!isMounted || !editor) return <div className={`w-full bg-[#020617] rounded-3xl border border-white/5 animate-pulse ${minHeight}`} />;

  if (isZen) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-[#020617] animate-in fade-in zoom-in duration-300 flex flex-col overflow-hidden">
         <EditorUI 
            editor={editor} 
            viewMode={viewMode} setViewMode={setViewMode} 
            isFullscreen={true} setIsFullscreen={setIsZen} 
            previewContent={previewContent}
         />
      </div>, 
      document.body
    );
  }

  return (
    <div className="w-full relative group">
       <EditorUI 
          editor={editor} 
          viewMode={viewMode} setViewMode={setViewMode} 
          isFullscreen={false} setIsFullscreen={setIsZen} 
          minHeight={minHeight}
          previewContent={previewContent}
       />
    </div>
  );
}
