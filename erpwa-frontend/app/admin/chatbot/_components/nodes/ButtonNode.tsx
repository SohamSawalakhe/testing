import React, { memo, useState } from "react";
import { Handle, Position, NodeProps, useReactFlow } from "reactflow";
import { Trash2, Check, Plus, GripVertical, Disc } from "lucide-react";

const ButtonNode = ({ id, data, selected }: NodeProps) => {
  const { setNodes } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [localData, setLocalData] = useState({
    label: data.label || "Buttons Message",
    buttons: data.buttons || [],
  });

  const handleDelete = () => {
    if (confirm("Delete this button node?")) {
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

  const addButton = () => {
    if (localData.buttons.length >= 3) return;
    setLocalData({
      ...localData,
      buttons: [
        ...localData.buttons,
        { id: Date.now().toString(), text: "New Button", type: "reply" },
      ],
    });
  };

  const removeButton = (idx: number) => {
    const newButtons = [...localData.buttons];
    newButtons.splice(idx, 1);
    setLocalData({ ...localData, buttons: newButtons });
  };

  const updateButtonText = (idx: number, text: string) => {
    const newButtons = [...localData.buttons];
    newButtons[idx].text = text;
    setLocalData({ ...localData, buttons: newButtons });
  };

  return (
    <div
      className={`relative shadow-xl rounded-xl bg-white border-2 transition-all duration-200 min-w-[240px] overflow-hidden ${
        selected
          ? "border-orange-500 ring-4 ring-orange-500/10"
          : "border-gray-100"
      }`}
    >
      {/* Node Header */}
      <div className="bg-gray-50/80 px-3 py-2 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-orange-500 flex items-center justify-center text-white">
            <Disc size={12} />
          </div>
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            Interactive
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
              className="w-full text-xs font-bold border-none bg-gray-50 p-2 rounded-md focus:ring-1 focus:ring-orange-500 outline-none"
              value={localData.label}
              onChange={(e) =>
                setLocalData({ ...localData, label: e.target.value })
              }
              placeholder="Message body..."
            />

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase">
                Buttons ({localData.buttons.length}/3)
              </label>
              {localData.buttons.map((btn: any, idx: number) => (
                <div key={idx} className="flex items-center gap-1">
                  <div className="flex-1 bg-gray-50 border border-gray-100 rounded-md flex items-center px-2">
                    <GripVertical size={10} className="text-gray-300 mr-1" />
                    <input
                      value={btn.text}
                      onChange={(e) => updateButtonText(idx, e.target.value)}
                      className="flex-1 bg-transparent border-none text-xs py-1.5 focus:ring-0 outline-none"
                    />
                  </div>
                  <button
                    onClick={() => removeButton(idx)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {localData.buttons.length < 3 && (
                <button
                  onClick={addButton}
                  className="w-full py-1.5 border border-dashed border-gray-300 text-gray-400 text-[10px] font-bold rounded-md flex items-center justify-center gap-1 hover:border-orange-500 hover:text-orange-500 hover:bg-orange-50 transition-all"
                >
                  <Plus size={12} /> ADD BUTTON
                </button>
              )}
            </div>

            <button
              onClick={handleSave}
              className="w-full py-1.5 bg-orange-500 text-white text-[10px] font-bold rounded-md flex items-center justify-center gap-1 hover:bg-orange-600 transition-all active:scale-95"
            >
              <Check size={12} /> SAVE CHANGES
            </button>
          </div>
        ) : (
          <div
            className="cursor-text group"
            onDoubleClick={() => setIsEditing(true)}
          >
            <div className="text-[11px] font-bold text-gray-800 mb-2 truncate group-hover:text-orange-600 transition-colors">
              {data.label || "Click to add text..."}
            </div>

            <div className="space-y-1.5 mt-2">
              {data.buttons?.map((btn: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-white border text-xs py-1.5 px-3 rounded-md text-center shadow-sm text-gray-600 font-medium relative group/item hover:border-orange-200 transition-colors"
                >
                  {btn.text}
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={`handle-${idx}`}
                    style={{
                      top: "50%",
                      right: "-8px",
                      transform: "translateY(-50%)",
                    }}
                    className="w-2.5 h-2.5 bg-orange-500 border-2 border-white shadow-sm transition-transform group-hover/item:scale-125"
                  />
                </div>
              ))}
              {(!data.buttons || data.buttons.length === 0) && (
                <div className="text-[10px] text-gray-400 italic text-center border-2 border-dashed border-gray-100 rounded-md py-2">
                  No buttons added
                </div>
              )}
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
        className="w-3 h-3 bg-gray-400 border-2 border-white shadow-sm"
      />
    </div>
  );
};

export default memo(ButtonNode);
