"use client";

import { useState, useCallback } from "react";
import { ChevronRight, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TreeNode {
  label: string;
  children?: TreeNode[];
}

interface TreeFilterProps {
  label: string;
  nodes: TreeNode[];
  selected: string[];
  onChange: (selected: string[]) => void;
  /** "dropdown" (default) or "panel" (always visible, for sidebars) */
  variant?: "dropdown" | "panel";
}

/** Collect all leaf labels in a subtree */
function getLeaves(node: TreeNode): string[] {
  if (!node.children || node.children.length === 0) return [node.label];
  return node.children.flatMap(getLeaves);
}

/** Collect all labels (branch + leaf) in a subtree */
function getAllLabels(node: TreeNode): string[] {
  const labels = [node.label];
  if (node.children) {
    for (const child of node.children) {
      labels.push(...getAllLabels(child));
    }
  }
  return labels;
}

function TreeNodeItem({
  node,
  selected,
  onToggle,
  depth = 0,
}: {
  node: TreeNode;
  selected: Set<string>;
  onToggle: (labels: string[], checked: boolean) => void;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  const allLabels = getAllLabels(node);
  const leaves = getLeaves(node);
  const allChecked = leaves.every((l) => selected.has(l));
  const someChecked = !allChecked && leaves.some((l) => selected.has(l));

  return (
    <div>
      <div
        className={cn("flex items-center gap-1 py-0.5 hover:bg-muted/50 rounded cursor-pointer")}
        style={{ paddingLeft: depth * 16 + 4 }}
      >
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-0.5 hover:bg-muted rounded shrink-0"
          >
            {expanded ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <label className="flex items-center gap-1.5 text-sm cursor-pointer min-w-0">
          <input
            type="checkbox"
            checked={allChecked}
            ref={(el) => {
              if (el) el.indeterminate = someChecked;
            }}
            onChange={() => onToggle(allLabels, !allChecked)}
            className="rounded border-border shrink-0"
          />
          <span className="truncate">{node.label}</span>
        </label>
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <TreeNodeItem
              key={child.label}
              node={child}
              selected={selected}
              onToggle={onToggle}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TreeFilter({ label, nodes, selected, onChange, variant = "dropdown" }: TreeFilterProps) {
  const [open, setOpen] = useState(false);
  const selectedSet = new Set(selected);

  const onToggle = useCallback(
    (labels: string[], checked: boolean) => {
      const set = new Set(selected);
      for (const l of labels) {
        if (checked) set.add(l);
        else set.delete(l);
      }
      onChange(Array.from(set));
    },
    [selected, onChange],
  );

  // Panel variant — always visible, for sidebar use
  if (variant === "panel") {
    return (
      <div className="border border-border rounded-lg bg-white overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
          {selected.length > 0 && (
            <button
              onClick={() => onChange([])}
              className="text-xs text-accent hover:underline"
            >
              Clear
            </button>
          )}
        </div>
        <div className="max-h-[400px] overflow-y-auto p-2">
          {nodes.map((node) => (
            <TreeNodeItem
              key={node.label}
              node={node}
              selected={selectedSet}
              onToggle={onToggle}
            />
          ))}
        </div>
      </div>
    );
  }

  // Dropdown variant (default)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1 border rounded px-2 py-1 text-sm bg-white min-w-[120px]",
          selected.length > 0
            ? "border-accent text-foreground"
            : "border-border text-muted-foreground",
        )}
      >
        <span className="truncate">
          {selected.length === 0 ? label : `${label} (${selected.length})`}
        </span>
        <ChevronDown
          className={cn("h-3 w-3 shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>

      {selected.length > 0 && (
        <button
          onClick={() => onChange([])}
          className="absolute -top-1.5 -right-1.5 bg-accent text-white rounded-full p-0.5"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-border rounded shadow-lg z-50 w-72 max-h-80 overflow-y-auto p-2">
          {nodes.map((node) => (
            <TreeNodeItem
              key={node.label}
              node={node}
              selected={selectedSet}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
