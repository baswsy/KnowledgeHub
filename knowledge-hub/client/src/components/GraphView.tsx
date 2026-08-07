import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { KnowledgeGraph, KnowledgeNode, KnowledgeEdge } from '../types';

interface GraphViewProps {
  graphData: KnowledgeGraph;
  onRefresh: () => void;
  onGenerate: () => void;
}

const COLORS = [
  '#4c6ef5', '#fa5252', '#40c057', '#fd7e14',
  '#7950f2', '#15aabf', '#e64980', '#fab005',
  '#82c91e', '#be4bdb', '#339af0', '#f06595',
];

export default function GraphView({ graphData, onRefresh, onGenerate }: GraphViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [highlightGroup, setHighlightGroup] = useState<string | null>(null);

  useEffect(() => {
    if (!svgRef.current || !graphData.nodes.length) return;
    renderGraph();
  }, [graphData, highlightGroup]);

  const renderGraph = () => {
    const svg = d3.select(svgRef.current!);
    const container = containerRef.current!;
    const width = container.clientWidth;
    const height = container.clientHeight;

    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    const g = svg.append('g');

    // 创建节点和边的副本
    const nodes: KnowledgeNode[] = graphData.nodes.map(n => ({ ...n }));
    const edges: KnowledgeEdge[] = graphData.edges.map(e => ({ ...e }));

    // 筛选
    const filteredNodes = highlightGroup
      ? nodes.filter(n => n.group === highlightGroup)
      : nodes;

    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = highlightGroup
      ? edges.filter(e => filteredNodeIds.has(e.source) || filteredNodeIds.has(e.target))
      : edges;

    const displayNodes = highlightGroup ? nodes.filter(n =>
      filteredNodeIds.has(n.id) || filteredEdges.some(e =>
        (e.source === n.id || e.target === n.id)
      )
    ) : nodes;

    const displayEdges = filteredEdges;

    // 力导向图
    const simulation = d3.forceSimulation(displayNodes as any)
      .force('link', d3.forceLink(displayEdges).id((d: any) => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40));

    // 绘制边
    const link = g.append('g')
      .selectAll('line')
      .data(displayEdges)
      .join('line')
      .attr('stroke', '#ddd')
      .attr('stroke-width', d => Math.max(1, d.strength * 0.5))
      .attr('stroke-opacity', 0.6);

    // 边标签
    const linkLabel = g.append('g')
      .selectAll('text')
      .data(displayEdges)
      .join('text')
      .text(d => d.label)
      .attr('font-size', '9px')
      .attr('fill', '#999')
      .attr('text-anchor', 'middle')
      .attr('dy', -5);

    // 绘制节点
    const node = g.append('g')
      .selectAll('g')
      .data(displayNodes)
      .join('g')
      .attr('class', 'graph-node')
      .style('cursor', 'pointer')
      .on('click', (_event: any, d: KnowledgeNode) => {
        setSelectedNode(d);
      })
      .call(d3.drag<any, any>()
        .on('start', (event: any, d: any) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event: any, d: any) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event: any, d: any) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }) as any);

    // 节点圆形
    node.append('circle')
      .attr('r', d => Math.max(10, Math.min(30, d.weight * 3.5)))
      .attr('fill', (d, i) => {
        const colorIdx = getHashIndex(d.group);
        return highlightGroup && d.group !== highlightGroup
          ? COLORS[colorIdx] + '40'
          : COLORS[colorIdx];
      })
      .attr('stroke', d => highlightGroup && d.group !== highlightGroup ? '#ddd' : '#fff')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', highlightGroup ? 0.5 : 1);

    // 节点标签
    node.append('text')
      .text(d => d.label.length > 8 ? d.label.slice(0, 8) + '...' : d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.3em')
      .attr('font-size', d => Math.max(8, d.weight * 0.9))
      .attr('fill', '#fff')
      .attr('font-weight', 'bold')
      .style('pointer-events', 'none');

    // 节点类型图标
    node.append('text')
      .text(d => d.type === 'video' ? '🎬' : d.type === 'note' ? '📝' : '')
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.weight > 7 ? 18 : 12)
      .attr('font-size', '10px')
      .style('pointer-events', 'none');

    // 力模拟
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      linkLabel
        .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
        .attr('y', (d: any) => (d.source.y + d.target.y) / 2);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    // 缩放
    const zoom = d3.zoom()
      .scaleExtent([0.3, 3])
      .on('zoom', (event: any) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom as any);
  };

  const groups = [...new Set(graphData.nodes.map(n => n.group))];

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="p-3 bg-white border-b border-gray-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-gray-800">知识图谱</h2>
          <span className="text-xs text-gray-400">
            {graphData.nodes.length} 节点 · {graphData.edges.length} 关系
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* 领域筛选 */}
          {groups.length > 0 && (
            <div className="flex gap-1">
              <button
                onClick={() => setHighlightGroup(null)}
                className={`text-xs px-2 py-1 rounded-full transition-colors ${
                  !highlightGroup ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                全部
              </button>
              {groups.map(g => (
                <button
                  key={g}
                  onClick={() => setHighlightGroup(g === highlightGroup ? null : g)}
                  className={`text-xs px-2 py-1 rounded-full transition-colors ${
                    highlightGroup === g ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          )}
          <button onClick={onRefresh} className="btn-secondary text-xs !py-1.5">刷新</button>
          <button onClick={onGenerate} className="btn-primary text-xs !py-1.5">生成图谱</button>
        </div>
      </div>

      {/* 图谱区域 */}
      <div className="flex-1 flex overflow-hidden">
        <div ref={containerRef} className="flex-1 relative bg-gray-50 graph-container">
          {graphData.nodes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <span className="text-6xl block mb-4">🕸️</span>
                <p className="text-lg font-medium mb-2">暂无知识图谱</p>
                <p className="text-sm mb-4">上传笔记后，让 Agent 生成你的专有知识图谱</p>
                <button onClick={onGenerate} className="btn-primary">生成知识图谱</button>
              </div>
            </div>
          ) : (
            <svg ref={svgRef} className="w-full h-full" />
          )}
        </div>

        {/* 右侧节点详情 */}
        {selectedNode && (
          <div className="w-64 bg-white border-l border-gray-200 p-4 overflow-y-auto animate-slide-up">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-gray-800 text-sm">{selectedNode.label}</h3>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">类型</span>
                <span className="tag">{selectedNode.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">领域</span>
                <span className="text-primary-600 font-medium">{selectedNode.group}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">重要度</span>
                <div className="flex items-center gap-1">
                  <div className="w-20 bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-primary-500 h-1.5 rounded-full"
                      style={{ width: `${(selectedNode.weight / 10) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">{selectedNode.weight}/10</span>
                </div>
              </div>
              {/* 关联边 */}
              {graphData.edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).length > 0 && (
                <div>
                  <span className="text-gray-500 block mb-1">关联关系</span>
                  {graphData.edges
                    .filter(e => e.source === selectedNode.id || e.target === selectedNode.id)
                    .map(e => {
                      const otherId = e.source === selectedNode.id ? e.target : e.source;
                      const otherNode = graphData.nodes.find(n => n.id === otherId);
                      return (
                        <div key={e.id} className="flex items-center gap-1 text-xs pl-2 py-0.5 text-gray-600">
                          <span>{e.label}</span>
                          <span className="text-primary-500">→</span>
                          <span>{otherNode?.label || otherId}</span>
                        </div>
                      );
                    })}
                </div>
              )}
              {selectedNode.url && (
                <a
                  href={selectedNode.url}
                  target="_blank"
                  className="btn-outline block text-center text-xs !py-1.5 mt-3"
                >
                  查看来源 →
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 图例 */}
      {graphData.nodes.length > 0 && (
        <div className="p-2 bg-white border-t border-gray-100 flex gap-3 overflow-x-auto shrink-0">
          {groups.map((g, i) => (
            <div key={g} className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[getHashIndex(g)] }} />
              {g}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getHashIndex(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % COLORS.length;
}
