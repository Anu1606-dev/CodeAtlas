import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Line, Text } from "@react-three/drei";
import { Loader2 } from "lucide-react";
import { useRepos } from "../context/RepoContext";
import { useTheme } from "../context/ThemeContext";
import { apiGet } from "../lib/api";
import type { RepoGraphResponse, GraphNode } from "@codeatlas/shared";

const GROUP_COLORS = ["#a855f7", "#3b82f6", "#22d3ee", "#f97316", "#ec4899", "#84cc16", "#eab308"];

function colorForGroup(group: string, groups: string[]): string {
  const idx = groups.indexOf(group);
  return GROUP_COLORS[idx % GROUP_COLORS.length];
}

interface PositionedNode extends GraphNode {
  position: [number, number, number];
}

function layoutNodes(nodes: GraphNode[]): PositionedNode[] {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const radius = Math.max(4, nodes.length * 0.35);
  return nodes.map((n, i) => {
    const y = 1 - (i / Math.max(1, nodes.length - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    return { ...n, position: [Math.cos(theta) * r * radius, y * radius, Math.sin(theta) * r * radius] };
  });
}

function GraphScene({ data, isDark }: { data: RepoGraphResponse; isDark: boolean }) {
  const groups = useMemo(() => [...new Set(data.nodes.map((n) => n.group))], [data.nodes]);
  const positioned = useMemo(() => layoutNodes(data.nodes), [data.nodes]);
  const positionById = useMemo(() => new Map(positioned.map((n) => [n.id, n.position])), [positioned]);

  const lineColor = isDark ? "#888" : "#94a3b8";
  const textColor = isDark ? "#ffffff" : "#0f172a";

  return (
    <>
      <ambientLight intensity={0.7} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <OrbitControls enableDamping dampingFactor={0.1} />

      {data.edges.map((e, idx) => {
        const from = positionById.get(e.source);
        const to = positionById.get(e.target);
        if (!from || !to) return null;
        return <Line key={idx} points={[from, to]} color={lineColor} lineWidth={0.5} transparent opacity={0.4} />;
      })}

      {positioned.map((n) => (
        <group key={n.id} position={n.position}>
          <mesh>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial color={colorForGroup(n.group, groups)} />
          </mesh>
          <Text position={[0, 0.25, 0]} fontSize={0.15} color={textColor} anchorX="center" anchorY="bottom">
            {n.label}
          </Text>
        </group>
      ))}
    </>
  );
}

export default function GraphPage() {
  const { selectedRepo } = useRepos();
  const { theme } = useTheme();
  const isDark = theme === "codeatlas-dark";
  const [data, setData] = useState<RepoGraphResponse | null>(null);

  useEffect(() => {
    if (!selectedRepo) return;
    setData(null);
    apiGet<RepoGraphResponse>(`/api/repos/${selectedRepo.id}/graph`).then(setData);
  }, [selectedRepo]);

  if (!selectedRepo) return <div className="p-8 text-center text-muted-foreground">No repo connected.</div>;
  if (data === null) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
  if (data.nodes.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">No graph data yet — run indexing (with the latest backend) first.</div>;
  }

  return (
    <div className="relative h-[calc(100vh-3.5rem)] w-full bg-background">
      <Canvas camera={{ position: [0, 0, 15], fov: 60 }}>
        <GraphScene data={data} isDark={isDark} />
      </Canvas>
      <div className="absolute bottom-4 left-4 text-xs text-foreground/60">
        {data.nodes.length} files · {data.edges.length} connections · drag to orbit, scroll to zoom
      </div>
    </div>
  );
}