export function advance(flow, session, index) {
 const n = flow.nodes[session.node];
 if (!session.confirmed || n.terminal || !n.choices[index]) throw Error('Invalid transition');
 return {...session, node:n.choices[index].next, history:[...session.history,{node:session.node,choice:n.choices[index].label,at:new Date().toISOString()}]};
}
export function fresh(flow) { return {schemaVersion:1,flowId:flow.id,revision:flow.revision,node:flow.start,confirmed:false,notes:{},history:[],createdAt:new Date().toISOString()}; }
