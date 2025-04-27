import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { CheckCircle2 } from "lucide-react";
import type { FC } from "react";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  description?: string;
}

interface Staff {
  id: string;
  name: string;
}

interface ReservationConfirmProps {
  date: Date;
  time: string;
  menuItems: MenuItem[];
  staff?: Staff;
  totalPrice: number;
  onBack: () => void;
  onConfirm: () => void;
}

export const ReservationConfirm: FC<ReservationConfirmProps> = ({
  date,
  time,
  menuItems,
  staff,
  totalPrice,
  onBack,
  onConfirm,
}) => {
  return (
    <Card className="max-w-md mx-auto p-0 mt-8 shadow-xl rounded-2xl overflow-hidden">
      {/* グラデーションバー削除 */}
      <div className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="text-blue-400 w-6 h-6" />
          <h2 className="text-xl font-bold">予約内容の確認</h2>
        </div>
        <p className="mb-2 text-base text-gray-700">
          以下の内容でお間違いないでしょうか？
        </p>
        <p className="mb-4 text-sm text-gray-500">
          ご予約内容をご確認のうえ、よろしければ下のボタンで確定してください。
        </p>
        <div className="mb-4 space-y-2">
          <div className="flex justify-between border-b pb-1">
            <span className="font-semibold">日付</span>
            <span>{date.toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between border-b pb-1">
            <span className="font-semibold">時間</span>
            <span>{time}</span>
          </div>
          <div className="border-b pb-2">
            <span className="font-semibold">メニュー</span>
            <ul className="list-disc list-inside ml-4 mt-1 text-sm text-gray-700">
              {menuItems.map((item) => (
                <li key={item.id}>
                  {item.name}（{item.price.toLocaleString()}円）
                </li>
              ))}
            </ul>
          </div>
          {staff && (
            <div className="flex justify-between border-b pb-1">
              <span className="font-semibold">担当者</span>
              <span>{staff.name}</span>
            </div>
          )}
          <div className="flex justify-between pt-2">
            <span className="font-bold text-gray-700">合計金額</span>
            <span className="font-bold text-lg text-pink-500">
              {totalPrice.toLocaleString()}円
            </span>
          </div>
        </div>
        <div className="flex gap-4 mt-8">
          <Button
            variant="outline"
            className="flex-1 border-gray-300"
            onClick={onBack}
          >
            戻る
          </Button>
          <Button
            className="flex-1 text-white bg-blue-500 hover:bg-blue-600 border-0 shadow-md transition"
            onClick={onConfirm}
          >
            この内容で予約する
          </Button>
        </div>
      </div>
    </Card>
  );
};
