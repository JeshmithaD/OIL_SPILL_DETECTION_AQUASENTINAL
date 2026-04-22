import { motion } from 'framer-motion';

const Ship = ({ rotation = 0 }) => {
  return (
    <motion.div 
      className="ship-container"
      animate={{ rotate: rotation }}
      transition={{ type: 'spring', stiffness: 50, damping: 20 }}
    >
      <div className="ship-wake" />
      <div className="ship-body">
        <div className="ship-bridge" />
        {/* Antennas and details */}
        <div className="absolute top-2 left-10 w-4 h-1 bg-slate-400 rounded-full" />
        <div className="absolute top-7 left-10 w-4 h-1 bg-slate-400 rounded-full" />
        <div className="absolute top-4 left-4 w-2 h-2 bg-slate-800 rounded-full" />
      </div>
    </motion.div>
  );
};

export default Ship;
