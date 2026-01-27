import React, { memo, useState } from "react";
import { Handle, Position, NodeProps, useReactFlow } from "reactflow";
import { Trash2, Check, Plus, GripVertical, List } from "lucide-react";

const ListNode = ({ id, data, selected }: NodeProps) => {
  const { setNodes } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [localData, setLocalData] = useState({
    label: data.label || "Select an option",
    items: data.items || [],
  });

  const handleDelete = () => {
    if (confirm("Delete this list node?")) {
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

  const addItem = () => {
    if (localData.items.length >= 10) return;
    setLocalData({
      ...localData,
      items: [
        ...localData.items,
        { id: Date.now().toString(), title: "New Item", description: "" },
      ],
    });
  };

  const removeItem = (idx: number) => {
    const newItems = [...localData.items];
    newItems.splice(idx, 1);
    setLocalData({ ...localData, items: newItems });
  };

  const updateItemTitle = (idx: number, title: string) => {
    const newItems = [...localData.items];
    newItems[idx].title = title;
    setLocalData({ ...localData, items: newItems });
  };

  return (
    <div
      className={`relative shadow-xl rounded-xl bg-white border-2 transition-all duration-200 min-w-[240px] overflow-hidden ${
        selected ? "border-blue-500 ring-4 ring-blue-500/10" : "border-gray-100"
      }`}
    >
      {/* Node Header */}
      <div className="bg-gray-50/80 px-3 py-2 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-500 flex items-center justify-center text-white">
            <List size={12} />
          </div>
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            List Menu
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
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">
                Menu Title
              </label>
              <input
                type="text"
                className="w-full text-xs font-bold border-none bg-gray-50 p-2 rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
                value={localData.label}
                onChange={(e) =>
                  setLocalData({ ...localData, label: e.target.value })
                }
                placeholder="Menu title..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase">
                Items ({localData.items.length}/10)
              </label>
              <div className="max-h-[200px] overflow-y-auto space-y-1.5 pr-1">
                {localData.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-1">
                    <div className="flex-1 bg-gray-50 border border-gray-100 rounded-md flex items-center px-2">
                      <GripVertical size={10} className="text-gray-300 mr-1" />
                      <input
                        value={item.title}
                        onChange={(e) => updateItemTitle(idx, e.target.value)}
                        className="flex-1 bg-transparent border-none text-xs py-1.5 focus:ring-0 outline-none"
                        placeholder="Item title"
                      />
                    </div>
                    <button
                      onClick={() => removeItem(idx)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>

              {localData.items.length < 10 && (
                <button
                  onClick={addItem}
                  className="w-full py-1.5 border border-dashed border-gray-300 text-gray-400 text-[10px] font-bold rounded-md flex items-center justify-center gap-1 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50 transition-all"
                >
                  <Plus size={12} /> ADD ITEM
                </button>
              )}
            </div>

            <button
              onClick={handleSave}
              className="w-full py-1.5 bg-blue-500 text-white text-[10px] font-bold rounded-md flex items-center justify-center gap-1 hover:bg-blue-600 transition-all active:scale-95"
            >
              <Check size={12} /> SAVE CHANGES
            </button>
          </div>
        ) : (
          <div
            className="cursor-text group"
            onDoubleClick={() => setIsEditing(true)}
          >
            <div className="text-[11px] font-bold text-gray-800 mb-2 truncate group-hover:text-blue-600 transition-colors">
              {data.label || "Click to set title..."}
            </div>

            <div className="space-y-1.5 mt-2">
              {data.items?.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-white border text-xs py-2 px-3 rounded-md shadow-sm text-gray-600 font-medium relative group/item hover:border-blue-200 transition-colors flex justify-between items-center"
                >
                  <span className="truncate max-w-[140px]">{item.title}</span>
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={`handle-${idx}`}
                    style={{
                      top: "50%",
                      right: "-8px",
                      transform: "translateY(-50%)",
                    }}
                    className="w-2.5 h-2.5 bg-blue-500 border-2 border-white shadow-sm transition-transform group-hover/item:scale-125"
                  />
                </div>
              ))}
              {(!data.items || data.items.length === 0) && (
                <div className="text-[10px] text-gray-400 italic text-center border-2 border-dashed border-gray-100 rounded-md py-4">
                  No items added
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

export default memo(ListNode);
