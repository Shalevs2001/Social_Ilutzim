import { BallotComposition } from "./BallotVideo";
import { MyComposition } from "./Composition";
import { IranComposition } from "./IranVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <MyComposition />
      <IranComposition />
      <BallotComposition />
    </>
  );
};
