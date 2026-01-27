import React, { memo, useState } from "react";
import { Handle, Position, NodeProps, useReactFlow } from "reactflow";
import { Trash2, Check, MessageSquare } from "lucide-react";

const MessageNode = ({ id, data, selected }: NodeProps) => {
  const { setNodes } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [localData, setLocalData] = useState({
    label: data.label || "Send Message",
    content: data.content || "",
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

  return (
    <div
      className={`relative shadow-xl rounded-xl bg-white border-2 transition-all duration-200 min-w-[220px] overflow-hidden ${
        selected ? "border-primary ring-4 ring-primary/10" : "border-gray-100"
      }`}
    >
      {/* Node Header */}
      <div className="bg-gray-50/80 px-3 py-2 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-500 flex items-center justify-center text-white">
            <MessageSquare size={12} />
          </div>
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            Message
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleDelete}
            className="p-1 px-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
            title="Delete Node"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Node Body */}
      <div className="p-3 bg-white space-y-3">
        {isEditing ? (
          <div className="space-y-2 nodrag">
            <input
              type="text"
              className="w-full text-xs font-bold border-none bg-gray-50 p-2 rounded-md focus:ring-1 focus:ring-primary outline-none"
              value={localData.label}
              onChange={(e) =>
                setLocalData({ ...localData, label: e.target.value })
              }
              placeholder="Label..."
              autoFocus
            />
            <textarea
              className="w-full text-xs border-none bg-gray-50 p-2 rounded-md focus:ring-1 focus:ring-primary outline-none min-h-[60px] resize-none"
              value={localData.content}
              onChange={(e) =>
                setLocalData({ ...localData, content: e.target.value })
              }
              placeholder="Type message here..."
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
            className="cursor-text group min-h-[40px]"
            onDoubleClick={() => setIsEditing(true)}
          >
            <div className="text-[11px] font-bold text-gray-800 mb-1 group-hover:text-primary transition-colors">
              {data.label || "Click to edit label"}
            </div>
            <div className="text-xs text-gray-600 leading-relaxed italic">
              {data.content
                ? `"${data.content}"`
                : "Double click to add message content..."}
            </div>
          </div>
        )}
      </div>

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

export default memo(MessageNode);
