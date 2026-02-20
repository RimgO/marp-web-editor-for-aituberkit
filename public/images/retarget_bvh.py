import bpy
import os
import sys

def run_bvh_retargeting(bvh_path, target_armature_name):
    """
    BVHをインポートし、Auto-Rig Proを使用して指定したアーマチュアにリターゲットするスクリプト
    Script to import BVH and retarget it to a specified armature using Auto-Rig Pro.
    """
    
    print(f"Starting retargeting process...")
    print(f"BVH Path: {bvh_path}")
    print(f"Target Armature: {target_armature_name}")

    # 1. BVHファイルのインポート / Import BVH file
    if not os.path.exists(bvh_path):
        print(f"Error: BVH file not found at {bvh_path}")
        return

    # インポート（シーン期間を更新する設定） / Import with scene duration update
    bpy.ops.import_anim.bvh(filepath=bvh_path, update_scene_fps=True, update_scene_duration=True)
    
    # インポートされた直後のオブジェクト（BVHアーマチュア）を取得 / Get the imported BVH armature
    # bpy.ops.import_anim.bvh makes the imported object active
    bvh_armature = bpy.context.active_object
    if bvh_armature is None or bvh_armature.type != 'ARMATURE':
        # Fallback: try to find it if active object isn't it (unlikely but possible)
        # In most cases, the imported BVH is selected and active.
        print("Warning: Active object is not an armature. Checking selected objects...")
        selected = bpy.context.selected_objects
        for obj in selected:
            if obj.type == 'ARMATURE' and obj != bpy.data.objects.get(target_armature_name):
                bvh_armature = obj
                break
    
    if not bvh_armature:
         print("Error: Could not identify imported BVH armature.")
         return

    bvh_armature.name = "Source_BVH"
    print(f"BVH imported as '{bvh_armature.name}'")
    
    # ターゲットとなるアーマチュアを取得 / Get target armature
    target_armature = bpy.data.objects.get(target_armature_name)
    if not target_armature:
        print(f"Error: Target armature '{target_armature_name}' not found.")
        return

    # 2. Auto-Rig Pro: Remap の設定 / Auto-Rig Pro: Remap setup
    # ARPのアドオンが有効であることを確認 / Check if ARP addon is enabled
    if not hasattr(bpy.ops, "arp"):
        print("Error: Auto-Rig Pro addon is not enabled or installed.")
        return

    # ソースとターゲットを指定 / Set source and target
    # ARPの内部プロパティにセット（ARPのUI操作を模倣） / Mimic ARP UI operations
    scene = bpy.context.scene
    try:
        scene.arp_source_armature = bvh_armature.name
        scene.arp_target_armature = target_armature.name
    except AttributeError:
        print("Error: Could not set ARP source/target properties. Check ARP version.")
        return

    # オートスケール実行 / Execute Auto-Scale
    print("Running Auto-Scale...")
    try:
        bpy.ops.arp.auto_scale()
    except Exception as e:
        print(f"Warning: Auto-scale failed: {e}")

    # 3. ボーンリストの構築とリターゲット / Build Bone List and Retarget
    # 注意: 本来は手動で定義が必要ですが、ここでは一般的なBVHの命名規則に基づいた
    # 定義済みのマッピング(bmapファイル)をロードするか、Build Bones Listを実行します。
    print("Building bones list...")
    bpy.ops.arp.build_bones_list()

    # ※ 特定のマッピングプリセットがある場合はここでロード
    # If you have a specific mapping preset, load it here:
    # bpy.ops.arp.import_bone_map(filepath="/path/to/your_mapping.bmap")

    # リターゲット実行 / Execute Retargeting
    # 実行前にターゲットアーマチュアをアクティブにする必要がある場合があります
    # Ensure target armature is active
    bpy.context.view_layer.objects.active = target_armature
    
    print("Executing Retarget...")
    try:
        bpy.ops.arp.retarget()
        print("Retargeting completed successfully.")
    except Exception as e:
        print(f"Error during retargeting: {e}")

# --- メイン実行ブロック / Main Execution Block ---

if __name__ == "__main__":
    # デフォルト設定 (必要に応じて書き換えてください) / Default settings (Edit as needed)
    # Windows Example: r"C:\path\to\your\motion.bvh"
    # Mac/Linux Example: "/Users/username/motion.bvh"
    DEFAULT_BVH_PATH = r"/path/to/your/motion.bvh"
    DEFAULT_RIG_NAME = "Armature"

    # コマンドライン引数があればそれを使用、なければデフォルトを使用
    # Use command line arguments if valid, otherwise use defaults
    # Note: When running in Blender normally, argv includes blender args.
    # To parse args safely in Blender, we usually look after "--" separator if using python directly,
    # but for simple script execution via MCP, we might just look for variables or modify this file.
    
    # Simple check: if script is modified by MCP to have variables set, use them.
    # Otherwise, script uses defaults.
    
    # To make it easier for MCP to inject values, we check for environment variables or just use the variables below.
    
    bvh_file_path = os.environ.get("BVH_PATH", DEFAULT_BVH_PATH)
    character_rig_name = os.environ.get("TARGET_RIG", DEFAULT_RIG_NAME)

    # 実行 / Run
    run_bvh_retargeting(bvh_file_path, character_rig_name)
