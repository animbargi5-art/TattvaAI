import { useMemo } from "react";

import {
    ReactFlow,
    Background,
    Controls,
    MiniMap
} from "reactflow";

import "reactflow/dist/style.css";
import "../../styles/investigation-graph.css";

export default function InvestigationGraph({ investigation }) {
    const graph = investigation?.report?.graph || investigation?.final_report?.graph || investigation?.graph || investigation?.reasoning?.graph;

    const nodes = useMemo(() => {

        return (graph?.nodes || []).map((node, index) => ({

            id: String(node.id),

            data: {
                label: node.label
            },

            position: {
                x: 80 + (index % 4) * 180,
                y: 80 + Math.floor(index / 4) * 140
            }

        }));

    }, [graph?.nodes]);

    const edges = useMemo(() => {

        return (graph?.edges || []).map((edge, index) => ({

            id: `edge-${index}`,

            source: String(edge.source),

            target: String(edge.target),

            label: edge.relation,

            animated: true

        }));

    }, [graph?.edges]);

    if (!investigation) {

        return null;

    }

    return (

        <div className="graph-panel">

            <h2>Knowledge Graph</h2>

            <div className="graph-container">

                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    fitView
                >

                    <MiniMap />

                    <Controls />

                    <Background />

                </ReactFlow>

            </div>

        </div>

    );

}
