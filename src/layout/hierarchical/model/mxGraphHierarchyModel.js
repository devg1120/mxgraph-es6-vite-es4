import { mxGraphHierarchyEdge } from "@mxgraph/layout/hierarchical/model/mxGraphHierarchyEdge";
import { mxGraphHierarchyNode } from "@mxgraph/layout/hierarchical/model/mxGraphHierarchyNode";
import { mxUtils } from "@mxgraph/util/mxUtils";
import { mxDictionary } from "@mxgraph/util/mxDictionary";

export class mxGraphHierarchyModel {
  ranks = null;
  dfsCount = 0;
  SOURCESCANSTARTRANK = 100000000;

  constructor(layout, vertices, roots, parent, tightenToSource) {
    var graph = layout.getGraph();
    this.tightenToSource = tightenToSource;
    this.roots = roots;
    this.parent = parent;
    this.vertexMapper = new mxDictionary();
    this.edgeMapper = new mxDictionary();
    this.maxRank = 0;
    var internalVertices = [];

    if (vertices == null) {
      vertices = this.graph.getChildVertices(parent);
    }

    this.maxRank = this.SOURCESCANSTARTRANK;
    this.createInternalCells(layout, vertices, internalVertices);

    for (var i = 0; i < vertices.length; i++) {
      var edges = internalVertices[i].connectsAsSource;

      for (var j = 0; j < edges.length; j++) {
        var internalEdge = edges[j];
        var realEdges = internalEdge.edges;

        if (realEdges != null && realEdges.length > 0) {
          var realEdge = realEdges[0];
          var targetCell = layout.getVisibleTerminal(realEdge, false);
          var internalTargetCell = this.vertexMapper.get(targetCell);

          if (internalVertices[i] == internalTargetCell) {
            targetCell = layout.getVisibleTerminal(realEdge, true);
            internalTargetCell = this.vertexMapper.get(targetCell);
          }

          if (
            internalTargetCell != null &&
            internalVertices[i] != internalTargetCell
          ) {
            internalEdge.target = internalTargetCell;

            if (internalTargetCell.connectsAsTarget.length == 0) {
              internalTargetCell.connectsAsTarget = [];
            }

            if (
              mxUtils.indexOf(
                internalTargetCell.connectsAsTarget,
                internalEdge,
              ) < 0
            ) {
              internalTargetCell.connectsAsTarget.push(internalEdge);
            }
          }
        }
      }

      internalVertices[i].temp[0] = 1;
    }
  }

  createInternalCells(layout, vertices, internalVertices) {
    var graph = layout.getGraph();

    for (var i = 0; i < vertices.length; i++) {
      internalVertices[i] = new mxGraphHierarchyNode(vertices[i]);
      this.vertexMapper.put(vertices[i], internalVertices[i]);
      var conns = layout.getEdges(vertices[i]);
      internalVertices[i].connectsAsSource = [];

      for (var j = 0; j < conns.length; j++) {
        var cell = layout.getVisibleTerminal(conns[j], false);

        if (
          cell != vertices[i] &&
          layout.graph.model.isVertex(cell) &&
          !layout.isVertexIgnored(cell)
        ) {
          var undirectedEdges = layout.getEdgesBetween(
            vertices[i],
            cell,
            false,
          );
          var directedEdges = layout.getEdgesBetween(vertices[i], cell, true);

          if (
            undirectedEdges != null &&
            undirectedEdges.length > 0 &&
            this.edgeMapper.get(undirectedEdges[0]) == null &&
            directedEdges.length * 2 >= undirectedEdges.length
          ) {
            var internalEdge = new mxGraphHierarchyEdge(undirectedEdges);

            for (var k = 0; k < undirectedEdges.length; k++) {
              var edge = undirectedEdges[k];
              this.edgeMapper.put(edge, internalEdge);
              graph.resetEdge(edge);

              if (layout.disableEdgeStyle) {
                layout.setEdgeStyleEnabled(edge, false);
                layout.setOrthogonalEdge(edge, true);
              }
            }

            internalEdge.source = internalVertices[i];

            if (
              mxUtils.indexOf(
                internalVertices[i].connectsAsSource,
                internalEdge,
              ) < 0
            ) {
              internalVertices[i].connectsAsSource.push(internalEdge);
            }
          }
        }
      }

      internalVertices[i].temp[0] = 0;
    }
  }

  initialRank() {
    var startNodes = [];

    if (this.roots != null) {
      for (var i = 0; i < this.roots.length; i++) {
        var internalNode = this.vertexMapper.get(this.roots[i]);

        if (internalNode != null) {
          startNodes.push(internalNode);
        }
      }
    }

    var internalNodes = this.vertexMapper.getValues();

    for (var i = 0; i < internalNodes.length; i++) {
      internalNodes[i].temp[0] = -1;
    }

    var startNodesCopy = startNodes.slice();

    while (startNodes.length > 0) {
      var internalNode = startNodes[0];
      var layerDeterminingEdges;
      var edgesToBeMarked;
      layerDeterminingEdges = internalNode.connectsAsTarget;
      edgesToBeMarked = internalNode.connectsAsSource;
      var allEdgesScanned = true;
      var minimumLayer = this.SOURCESCANSTARTRANK;

      for (var i = 0; i < layerDeterminingEdges.length; i++) {
        var internalEdge = layerDeterminingEdges[i];

        if (internalEdge.temp[0] == 5270620) {
          var otherNode = internalEdge.source;
          minimumLayer = Math.min(minimumLayer, otherNode.temp[0] - 1);
        } else {
          allEdgesScanned = false;
          break;
        }
      }

      if (allEdgesScanned) {
        internalNode.temp[0] = minimumLayer;
        this.maxRank = Math.min(this.maxRank, minimumLayer);

        if (edgesToBeMarked != null) {
          for (var i = 0; i < edgesToBeMarked.length; i++) {
            var internalEdge = edgesToBeMarked[i];
            internalEdge.temp[0] = 5270620;
            var otherNode = internalEdge.target;

            if (otherNode.temp[0] == -1) {
              startNodes.push(otherNode);
              otherNode.temp[0] = -2;
            }
          }
        }

        startNodes.shift();
      } else {
        var removedCell = startNodes.shift();
        startNodes.push(internalNode);

        if (removedCell == internalNode && startNodes.length == 1) {
          break;
        }
      }
    }

    for (var i = 0; i < internalNodes.length; i++) {
      internalNodes[i].temp[0] -= this.maxRank;
    }

    for (var i = 0; i < startNodesCopy.length; i++) {
      var internalNode = startNodesCopy[i];
      var currentMaxLayer = 0;
      var layerDeterminingEdges = internalNode.connectsAsSource;

      for (var j = 0; j < layerDeterminingEdges.length; j++) {
        var internalEdge = layerDeterminingEdges[j];
        var otherNode = internalEdge.target;
        internalNode.temp[0] = Math.max(currentMaxLayer, otherNode.temp[0] + 1);
        currentMaxLayer = internalNode.temp[0];
      }
    }

    this.maxRank = this.SOURCESCANSTARTRANK - this.maxRank;
  }

  fixRanks() {
    var rankList = [];
    this.ranks = [];

    for (var i = 0; i < this.maxRank + 1; i++) {
      rankList[i] = [];
      this.ranks[i] = rankList[i];
    }

    var rootsArray = null;

    if (this.roots != null) {
      var oldRootsArray = this.roots;
      rootsArray = [];

      for (var i = 0; i < oldRootsArray.length; i++) {
        var cell = oldRootsArray[i];
        var internalNode = this.vertexMapper.get(cell);
        rootsArray[i] = internalNode;
      }
    }

    this.visit(
      function (parent, node, edge, layer, seen) {
        if (seen == 0 && node.maxRank < 0 && node.minRank < 0) {
          rankList[node.temp[0]].push(node);
          node.maxRank = node.temp[0];
          node.minRank = node.temp[0];
          node.temp[0] = rankList[node.maxRank].length - 1;
        }

        if (parent != null && edge != null) {
          var parentToCellRankDifference = parent.maxRank - node.maxRank;

          if (parentToCellRankDifference > 1) {
            edge.maxRank = parent.maxRank;
            edge.minRank = node.maxRank;
            edge.temp = [];
            edge.x = [];
            edge.y = [];

            for (var i = edge.minRank + 1; i < edge.maxRank; i++) {
              rankList[i].push(edge);
              edge.setGeneralPurposeVariable(i, rankList[i].length - 1);
            }
          }
        }
      },
      rootsArray,
      false,
      null,
    );
  }

  visit(visitor, dfsRoots, trackAncestors, seenNodes) {
    if (dfsRoots != null) {
      for (var i = 0; i < dfsRoots.length; i++) {
        var internalNode = dfsRoots[i];

        if (internalNode != null) {
          if (seenNodes == null) {
            seenNodes = new Object();
          }

          if (trackAncestors) {
            internalNode.hashCode = [];
            internalNode.hashCode[0] = this.dfsCount;
            internalNode.hashCode[1] = i;
            this.extendedDfs(
              null,
              internalNode,
              null,
              visitor,
              seenNodes,
              internalNode.hashCode,
              i,
              0,
            );
          } else {
            this.dfs(null, internalNode, null, visitor, seenNodes, 0);
          }
        }
      }

      this.dfsCount++;
    }
  }

  dfs(parent, root, connectingEdge, visitor, seen, layer) {
    if (root != null) {
      var rootId = root.id;

      if (seen[rootId] == null) {
        seen[rootId] = root;
        visitor(parent, root, connectingEdge, layer, 0);
        var outgoingEdges = root.connectsAsSource.slice();

        for (var i = 0; i < outgoingEdges.length; i++) {
          var internalEdge = outgoingEdges[i];
          var targetNode = internalEdge.target;
          this.dfs(root, targetNode, internalEdge, visitor, seen, layer + 1);
        }
      } else {
        visitor(parent, root, connectingEdge, layer, 1);
      }
    }
  }

  extendedDfs(
    parent,
    root,
    connectingEdge,
    visitor,
    seen,
    ancestors,
    childHash,
    layer,
  ) {
    if (root != null) {
      if (parent != null) {
        if (root.hashCode == null || root.hashCode[0] != parent.hashCode[0]) {
          var hashCodeLength = parent.hashCode.length + 1;
          root.hashCode = parent.hashCode.slice();
          root.hashCode[hashCodeLength - 1] = childHash;
        }
      }

      var rootId = root.id;

      if (seen[rootId] == null) {
        seen[rootId] = root;
        visitor(parent, root, connectingEdge, layer, 0);
        var outgoingEdges = root.connectsAsSource.slice();

        for (var i = 0; i < outgoingEdges.length; i++) {
          var internalEdge = outgoingEdges[i];
          var targetNode = internalEdge.target;
          this.extendedDfs(
            root,
            targetNode,
            internalEdge,
            visitor,
            seen,
            root.hashCode,
            i,
            layer + 1,
          );
        }
      } else {
        visitor(parent, root, connectingEdge, layer, 1);
      }
    }
  }
}
