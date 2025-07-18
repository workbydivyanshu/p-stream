import React, { useState } from "react";

import { Icon, Icons } from "@/components/Icon";
import { UserIcon, UserIcons } from "@/components/UserIcon";

interface GroupDropdownProps {
  groups: string[];
  currentGroup?: string;
  onSelectGroup: (group: string) => void;
  onCreateGroup: (group: string, icon: UserIcons) => void;
  onRemoveGroup: () => void;
}

const userIconList = Object.values(UserIcons);

function parseGroupString(group: string): { icon: UserIcons; name: string } {
  const match = group.match(/^\[([a-zA-Z0-9_]+)\](.*)$/);
  if (match) {
    const iconKey = match[1].toUpperCase() as keyof typeof UserIcons;
    const icon = UserIcons[iconKey] || userIconList[0];
    const name = match[2].trim();
    return { icon, name };
  }
  return { icon: userIconList[0], name: group };
}

export function GroupDropdown({
  groups,
  currentGroup,
  onSelectGroup,
  onCreateGroup,
  onRemoveGroup,
}: GroupDropdownProps) {
  const [open, setOpen] = useState(false);
  const [newGroup, setNewGroup] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState<UserIcons>(userIconList[0]);

  const handleSelect = (group: string) => {
    setOpen(false);
    setShowInput(false);
    setNewGroup("");
    onSelectGroup(group);
  };

  const handleCreate = (group: string, icon: UserIcons) => {
    const groupString = `[${icon}]${group}`;
    onCreateGroup(groupString, icon);
    setOpen(false);
    setShowInput(false);
    setNewGroup("");
    setSelectedIcon(userIconList[0]);
  };

  return (
    <div className="relative w-48">
      <button
        type="button"
        className="w-full px-3 py-2 text-xs bg-gray-700/50 border border-gray-600 rounded-lg text-white flex justify-between items-center"
        onClick={() => setOpen((v) => !v)}
      >
        {currentGroup ? (
          (() => {
            const { icon, name } = parseGroupString(currentGroup);
            return (
              <span className="flex items-center gap-2 font-semibold text-purple-400">
                <span className="w-6 h-6 flex items-center justify-center">
                  <UserIcon icon={icon} className="inline-block" />
                </span>
                {name}
              </span>
            );
          })()
        ) : (
          <span className="text-white/70">Add to group</span>
        )}
        <span className="ml-2 text-white/40">
          <Icon
            icon={open ? Icons.CHEVRON_UP : Icons.CHEVRON_DOWN}
            className="text-base"
          />
        </span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1 text-xs">
          {groups.length === 0 && !showInput && (
            <div className="px-4 py-2 text-gray-400">No groups</div>
          )}
          {groups.map((group) => {
            const { icon, name } = parseGroupString(group);
            return (
              <button
                type="button"
                key={group}
                className={`w-full text-left px-4 py-2 hover:bg-purple-700/30 rounded-md flex items-center gap-2 ${
                  currentGroup === group
                    ? "text-purple-400 font-semibold"
                    : "text-white"
                }`}
                onClick={() => handleSelect(group)}
                disabled={currentGroup === group}
              >
                <span className="w-5 h-5 flex items-center justify-center mr-2">
                  <UserIcon
                    icon={icon}
                    className="inline-block w-full h-full"
                  />
                </span>
                {name}
              </button>
            );
          })}
          <div className="flex flex-col gap-2 px-4 py-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newGroup}
                onChange={(e) => setNewGroup(e.target.value)}
                className="flex-1 px-2 py-1 rounded bg-gray-700 text-white border border-gray-600 text-xs min-w-0"
                placeholder="Group name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate(newGroup, selectedIcon);
                  if (e.key === "Escape") setShowInput(false);
                }}
                style={{ minWidth: 0 }}
              />
              <button
                type="button"
                className="text-purple-400 font-bold px-2 py-1 min-w-[2.5rem]"
                onClick={() => handleCreate(newGroup, selectedIcon)}
                disabled={!newGroup.trim()}
                style={{ flexShrink: 0 }}
              >
                Add
              </button>
            </div>
            {newGroup.trim().length > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-2 w-full justify-center">
                {userIconList.map((icon) => (
                  <button
                    type="button"
                    key={icon}
                    className={`rounded p-1 border-2 ${
                      selectedIcon === icon
                        ? "border-purple-400 bg-gray-700"
                        : "border-transparent hover:border-gray-500"
                    }`}
                    onClick={() => setSelectedIcon(icon)}
                  >
                    <span className="w-5 h-5 flex items-center justify-center">
                      <UserIcon
                        icon={icon}
                        className={`w-full h-full ${selectedIcon === icon ? "text-purple-400" : ""}`}
                      />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {currentGroup && (
            <button
              type="button"
              className="w-full text-left px-4 pt-3 pb-2 text-red-400 hover:bg-red-700/30 border-t border-gray-700"
              onClick={() => {
                setOpen(false);
                onRemoveGroup();
              }}
            >
              Remove from group
            </button>
          )}
        </div>
      )}
    </div>
  );
}
