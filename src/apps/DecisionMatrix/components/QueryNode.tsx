import { Handle, Position } from '@xyflow/react';
import { motion } from 'motion/react';

export function QueryNode({ data }: { data: { query: string; isFocused?: boolean; hasFocusMode?: boolean } }) {
  const isDimmed = data.hasFocusMode && !data.isFocused;

  return (
    <motion.div 
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ 
        scale: 1, 
        opacity: isDimmed ? 0.3 : 1,
        filter: isDimmed ? 'blur(4px)' : 'blur(0px)'
      }}
      transition={{ type: 'spring', damping: 20, stiffness: 200 }}
      whileHover={{ scale: 1.05 }}
      className="glass-card w-[240px] p-6 border-my-accent/50 bg-my-callout/80 backdrop-blur-xl relative z-20 text-center cursor-pointer hover:border-my-accent transition-colors shadow-lg hover:shadow-my-accent/20"
    >
      <div className="text-[10px] text-my-accent uppercase font-bold mb-2 tracking-wider">Primary Query</div>
      <div className="text-lg font-medium leading-tight text-my-ink">"{data.query}"</div>
      <div className="mt-4 h-1 w-full bg-my-ink/10 rounded-full overflow-hidden">
        <div className="bg-my-accent h-full w-2/3"></div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </motion.div>
  );
}
