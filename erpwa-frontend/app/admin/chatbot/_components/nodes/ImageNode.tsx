import React, { memo, useState } from "react";
import { Handle, Position, NodeProps, useReactFlow } from "reactflow";
import { Trash2, Check, ImageIcon } from "lucide-react";
import GalleryModal from "../GalleryModal";

const ImageNode = ({ id, data, selected }: NodeProps) => {
  const { setNodes } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [localData, setLocalData] = useState({
    label: data.label || "Image Message",
    content: data.content || "",
    imageUrl: data.imageUrl || "",
  });

  const handleDelete = () => {
    if (confirm("Delete this node?")) {
      setNodes((nds) => nds.filter((node) => node.id !== id));
    }
  };

  const handleSave = () => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, ...localData } };
        }
        return node;
      }),
    );
    setIsEditing(false);
  };

  const onSelectImage = (url: string | string[]) => {
    const imageUrl = Array.isArray(url) ? url[0] : url;
    setLocalData({ ...localData, imageUrl });
    setIsGalleryOpen(false);
  };

  return (
    <div
      className={`relative shadow-xl rounded-xl bg-white border-2 transition-all duration-200 w-[200px] overflow-hidden ${
        selected ? "border-primary ring-4 ring-primary/10" : "border-gray-100"
      }`}
    >
      {/* Node Header */}
      <div className="bg-gray-50/80 px-3 py-2 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-pink-500 flex items-center justify-center text-white">
            <ImageIcon size={12} />
          </div>
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            Image
          </span>
        </div>
        <div className="flex items-center gap-1 text-gray-400">
          <button
            onClick={handleDelete}
            className="p-1 px-2 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="p-3 bg-white space-y-3">
        {isEditing ? (
          <div className="space-y-3 nodrag">
            <input
              type="text"
              className="w-full text-xs font-bold border-none bg-gray-50 p-2 rounded-md focus:ring-1 focus:ring-primary outline-none"
              value={localData.label}
              onChange={(e) =>
                setLocalData({ ...localData, label: e.target.value })
              }
              placeholder="Label..."
            />

            <div
              onClick={() => setIsGalleryOpen(true)}
              className="relative aspect-video w-full rounded-md overflow-hidden bg-gray-100 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors group"
            >
              {localData.imageUrl ? (
                <>
                  <img
                    src={localData.imageUrl}
                    className="w-full h-full object-cover"
                    alt="Preview"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-bold">
                    CHANGE IMAGE
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1 text-gray-400">
                  <ImageIcon size={20} />
                  <span className="text-[10px] font-medium">SELECT IMAGE</span>
                </div>
              )}
            </div>

            <textarea
              className="w-full text-xs border-none bg-gray-50 p-2 rounded-md focus:ring-1 focus:ring-primary outline-none min-h-[40px] resize-none"
              value={localData.content}
              onChange={(e) =>
                setLocalData({ ...localData, content: e.target.value })
              }
              placeholder="Add caption (optional)..."
            />

            <button
              onClick={handleSave}
              className="w-full py-1.5 bg-primary text-white text-[10px] font-bold rounded-md flex items-center justify-center gap-1 hover:bg-primary/90 transition-all active:scale-95"
            >
              <Check size={12} /> SAVE CHANGES
            </button>
          </div>
        ) : (
          <div
            className="cursor-text group"
            onDoubleClick={() => setIsEditing(true)}
          >
            <div className="text-[11px] font-bold text-gray-800 mb-2 truncate group-hover:text-primary transition-colors">
              {data.label || "Image Step"}
            </div>

            {data.imageUrl ? (
              <div className="relative aspect-video w-full rounded-md overflow-hidden bg-gray-100 border border-gray-100">
                <img
                  src={data.imageUrl}
                  className="w-full h-full object-cover"
                  alt="Workflow"
                />
              </div>
            ) : (
              <div className="aspect-video w-full rounded-md border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 text-[10px] text-gray-400 italic">
                No image selected
              </div>
            )}

            {data.content && (
              <div className="mt-2 text-[10px] text-gray-500 leading-snug italic line-clamp-2">
                &quot;{data.content}&quot;
              </div>
            )}
          </div>
        )}
      </div>

      <GalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        onSelect={onSelectImage}
      />

      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-gray-400 border-2 border-white shadow-sm"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-primary border-2 border-white shadow-sm"
      />
    </div>
  );
};

export default memo(ImageNode);
