'use client';

import { memo, useCallback, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Calculator, ChevronDown } from 'lucide-react';
import type { DataRow, MathOperation } from './types';

const OPERATIONS: { value: MathOperation; symbol: string; label: string }[] = [
  { value: '+', symbol: '+', label: 'Add' },
  { value: '-', symbol: '\u2212', label: 'Subtract' },
  { value: '*', symbol: '\u00d7', label: 'Multiply' },
  { value: '/', symbol: '\u00f7', label: 'Divide' },
  { value: '^', symbol: '^', label: 'Power' },
  { value: '%', symbol: '%', label: 'Modulo' },
];

function applyOperation(
  input: number,
  op: MathOperation,
  operand: number
): number {
  switch (op) {
    case '+':
      return input + operand;
    case '-':
      return input - operand;
    case '*':
      return input * operand;
    case '/':
      return operand === 0 ? NaN : input / operand;
    case '^':
      return Math.pow(input, operand);
    case '%':
      return operand === 0 ? NaN : input % operand;
    default:
      return input;
  }
}

function formatNumber(n: number): string {
  if (isNaN(n)) return 'ERR';
  if (!isFinite(n)) return '\u221e';
  return Math.round(n).toLocaleString();
}

interface MathNodeCallbacks {
  onOperationChange?: (nodeId: string, op: MathOperation) => void;
  onOperandChange?: (nodeId: string, val: number) => void;
  onFormulaChange?: (nodeId: string, formula: string) => void;
}

function MathNodeComponent({ id, data, selected }: NodeProps) {
  const row = data.row as DataRow;
  const callbacks = data as unknown as MathNodeCallbacks;
  const [isFormulaMode, setIsFormulaMode] = useState(!!row.formula);

  const inputRecords = row.records ?? 0;
  const operation = row.operation ?? '*';
  const operand = row.operand ?? 1;
  const formula = row.formula ?? '';

  // Compute output
  let outputRecords: number;
  if (isFormulaMode && formula) {
    outputRecords = evaluateSimpleFormula(formula, inputRecords);
  } else {
    outputRecords = applyOperation(inputRecords, operation, operand);
  }

  const opInfo = OPERATIONS.find((o) => o.value === operation) ?? OPERATIONS[2];

  const handleOpChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      callbacks.onOperationChange?.(id, e.target.value as MathOperation);
    },
    [id, callbacks]
  );

  const handleOperandChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      callbacks.onOperandChange?.(id, isNaN(val) ? 0 : val);
    },
    [id, callbacks]
  );

  const handleFormulaChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      callbacks.onFormulaChange?.(id, e.target.value);
    },
    [id, callbacks]
  );

  return (
    <div
      className={`rounded-lg border-2 px-4 py-3 shadow-sm transition-all min-w-[220px] max-w-[260px] ${
        selected
          ? 'border-violet-500 bg-violet-100 ring-2 ring-violet-300'
          : 'border-violet-300 bg-violet-50'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-violet-400 !border-2 !border-white"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Calculator className="w-4 h-4 text-violet-600" />
        <span className="font-semibold text-sm text-neutral-800">
          {row.label}
        </span>
        <span className="w-2 h-2 rounded-full ml-auto bg-emerald-500" />
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 mb-2">
        <button
          onClick={() => setIsFormulaMode(false)}
          className={`text-[10px] px-2 py-0.5 rounded font-medium transition-colors nodrag ${
            !isFormulaMode
              ? 'bg-violet-600 text-white'
              : 'bg-violet-200 text-violet-600 hover:bg-violet-300'
          }`}
        >
          Simple
        </button>
        <button
          onClick={() => setIsFormulaMode(true)}
          className={`text-[10px] px-2 py-0.5 rounded font-medium transition-colors nodrag ${
            isFormulaMode
              ? 'bg-violet-600 text-white'
              : 'bg-violet-200 text-violet-600 hover:bg-violet-300'
          }`}
        >
          Formula
        </button>
      </div>

      {!isFormulaMode ? (
        /* Simple mode: dropdown + value */
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-xs text-neutral-500 font-mono">rec</span>
          <div className="relative">
            <select
              value={operation}
              onChange={handleOpChange}
              className="appearance-none pl-2 pr-6 py-1 text-sm rounded border border-violet-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 font-mono nodrag cursor-pointer w-16"
            >
              {OPERATIONS.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.symbol}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-400 pointer-events-none" />
          </div>
          <input
            type="number"
            value={operand}
            onChange={handleOperandChange}
            step="any"
            className="w-20 px-2 py-1 text-sm rounded border border-violet-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 font-mono text-right nodrag"
          />
        </div>
      ) : (
        /* Formula mode */
        <div className="mb-2">
          <input
            type="text"
            value={formula}
            onChange={handleFormulaChange}
            placeholder="=records * 0.95"
            className="w-full px-2 py-1 text-sm rounded border border-violet-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 font-mono nodrag"
          />
          <div className="text-[10px] text-neutral-400 mt-0.5">
            Use &quot;records&quot; as the input variable
          </div>
        </div>
      )}

      {/* Input → Output display */}
      <div className="bg-white/60 rounded px-2 py-1.5 text-xs">
        <div className="flex justify-between text-neutral-500">
          <span>In</span>
          <span className="font-mono">{formatNumber(inputRecords)}</span>
        </div>
        <div className="flex justify-between text-neutral-500 mt-0.5">
          <span>
            {isFormulaMode ? 'fx' : opInfo.label}
          </span>
          <span className="font-mono text-violet-600">
            {isFormulaMode ? formula || '...' : `${opInfo.symbol} ${operand}`}
          </span>
        </div>
        <div className="border-t border-violet-200 mt-1 pt-1 flex justify-between font-semibold text-violet-700">
          <span>Out</span>
          <span className="font-mono">{formatNumber(outputRecords)}</span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-violet-400 !border-2 !border-white"
      />
    </div>
  );
}

/** Simple formula evaluator that supports "records" as a variable */
function evaluateSimpleFormula(formula: string, records: number): number {
  try {
    let expr = formula.startsWith('=') ? formula.slice(1) : formula;
    // Replace "records" with the actual value
    expr = expr.replace(/\brecords\b/gi, records.toString());
    // Safe evaluation: only allow numbers, operators, parens, and math functions
    if (!/^[\d\s+\-*/().%^,a-zA-Z]+$/.test(expr)) return NaN;
    // Replace math function names with Math.*
    expr = expr.replace(/\b(abs|round|floor|ceil|sqrt|min|max|pow|log)\b/gi, 'Math.$1');
    // Replace ^ with **
    expr = expr.replace(/\^/g, '**');
    // eslint-disable-next-line no-new-func
    const fn = new Function(`"use strict"; return (${expr});`);
    const result = fn();
    return typeof result === 'number' && isFinite(result) ? result : NaN;
  } catch {
    return NaN;
  }
}

export const MathNode = memo(MathNodeComponent);
