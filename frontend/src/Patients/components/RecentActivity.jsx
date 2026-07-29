
import { MoreHorizontal } from 'lucide-react';

const RECENT_ACTIVITIES = [
  {
    id: 1,
    doctorName: 'Dr. Emily Chen',
    doctorImage: 'https://images.unsplash.com/photo-1594824813566-88855ce783d1?auto=format&fit=crop&q=80&w=200',
    date: 'Oct 20, 2023',
    reason: 'Annual Checkup',
    status: 'Completed',
  },
  {
    id: 2,
    doctorName: 'Dr. Sarah Jenkins',
    doctorImage: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200',
    date: 'Sep 15, 2023',
    reason: 'Dental Cleaning',
    status: 'Completed',
  },
  {
    id: 3,
    doctorName: 'Dr. Alan Turing',
    doctorImage: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200',
    date: 'Aug 28, 2023',
    reason: 'Cognitive Assessment',
    status: 'Completed',
  },
  {
    id: 4,
    doctorName: 'Dr. Marcus Webb',
    doctorImage: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=200',
    date: 'Aug 10, 2023',
    reason: 'Knee Pain',
    status: 'Completed',
  },
  {
    id: 5,
    doctorName: 'Dr. Lisa Ray',
    doctorImage: 'https://images.unsplash.com/photo-1594824813566-88855ce783d1?auto=format&fit=crop&q=80&w=200',
    date: 'Jul 22, 2023',
    reason: 'Eye Exam',
    status: 'Completed',
  },
  {
    id: 6,
    doctorName: 'Dr. James Wilson',
    doctorImage: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=200',
    date: 'Jun 30, 2023',
    reason: 'Blood Test',
    status: 'Completed',
  },
];

export default function RecentActivity() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-6 w-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-slate-800">Recent Activity</h3>
        <button
          type="button"
          className="text-sm font-semibold text-[#00b0d8] hover:underline"
        >
          View All
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-slate-400 font-bold text-xs uppercase tracking-wider border-b border-slate-50">
              <th className="pb-4 font-bold">Doctor Name</th>
              <th className="pb-4 font-bold">Date</th>
              <th className="pb-4 font-bold">Reason</th>
              <th className="pb-4 font-bold">Status</th>
              <th className="pb-4 font-bold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {RECENT_ACTIVITIES.map((activity) => (
              <tr key={activity.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="relative w-10 h-10">
                      <img
                        src={activity.doctorImage}
                        alt={activity.doctorName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></div>
                    </div>
                    <span className="font-bold text-slate-800 text-sm whitespace-nowrap">
                      {activity.doctorName}
                    </span>
                  </div>
                </td>
                <td className="py-4 text-slate-500 font-medium text-sm whitespace-nowrap">
                  {activity.date}
                </td>
                <td className="py-4 text-slate-500 font-medium text-sm whitespace-nowrap">
                  {activity.reason}
                </td>
                <td className="py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 font-bold text-xs">
                    {activity.status}
                  </span>
                </td>
                <td className="py-4">
                  <button type="button" className="text-slate-400 hover:text-slate-600">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}