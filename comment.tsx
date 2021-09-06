import Dec from "../assets/declaration"
import { Comment, Analytics } from "../firebase/model"
import Stars from "./stars"
import Input from "./input"
import Auth from "./auth"
import Mixins from "../assets/mixins"
import React, { useEffect, useState } from "react"
import { StyleSheet, View, Text, Image } from "react-native"

interface MyProps {
  user: Dec.DB.User | undefined
  recipe: Dec.DB.Recipe
  comments: Dec.DB.Comment[] | undefined
  users: Dec.DB.User[] | undefined
  roles: Dec.DB.Role[] | undefined
  update: (param: Dec.General.Update) => void
  useSmall?: boolean
}

export default function CommentX({
  user,
  recipe,
  comments,
  users,
  roles,
  update,
  useSmall = true,
}: MyProps) {
  const ratingCheck: boolean = new Data().ratingUserCheck(recipe, user) // Has the user rated?

  const [roleB, b] = new Data().roles(user, roles)
  const [block, setBlock] = useState<boolean>(false) // Anti spam

  const [usersIDName, setUsersIDName] = useState<{ [x: string]: Dec.DB.User }>(
    {}
  )
  const [ratingNew, setRatingNew] = useState<number>(0) // User rating
  const [message, setMessage] = useState<string>("")

  /* Update user ID-Name bindings */
  useEffect(() => {
    setUsersIDName(new Data().getUsersIDName(users))
  }, [users])

  /* Recording a new grade */
  useEffect(() => {
    new Data().setRating(recipe.id, ratingNew, update)
  }, [ratingNew])

  /* Resetting a new grade */
  useEffect(() => {
    setRatingNew(0)
  }, [recipe?.ratingUserID])

  /* Anti spam */
  function timer() {
    setBlock(true)
    setTimeout(() => {
      setBlock(false)
    }, 3000)
  }

  const jsx = {
    auth() {
      return <Auth message={"Log in to leave a review"} recipeID={recipe.id} />
    },
    stars() {
      return (
        <View style={styles.stars}>
          <Stars
            rating={ratingNew}
            setRating={setRatingNew}
            small={useSmall ? "starsMicro" : "starsSmall"}
          />
        </View>
      )
    },
    setComment() {
      return (
        <Input
          elevation={false}
          name={"Leave a review"}
          input={[message, setMessage]}
          enter={() => {
            if (!block) {
              new Data().setComment(recipe.id, [message, setMessage], update)
              new Analytics().event("A_REVIEW")
              timer()
            }
          }}
        />
      )
    },
    comments() {
      return (comments || [])
        .filter((i) => i.recipeID === recipe.id && i.text)
        .filter((i) => b[i.userID] !== "b")
        .map((i) => {
          const id: string = i.id
          const name: string | undefined = usersIDName[i.userID]?.name
          const text: string | undefined = i.text
          const image: string =
            usersIDName[i.userID]?.avatar ||
            `https://ui-avatars.com/api/?size=50&name=${name}&font-size=0.33&background=663399&color=fff&rounded=true%22%20class=%22center-block`

          return name && text ? (
            <View key={`comment${id}`} style={styles.comment}>
              <View style={styles.comment2}>
                <Image style={styles.image} source={{ uri: image }} />
                <Text style={styles.text}>{name}</Text>
              </View>
              <Text>{text}</Text>
            </View>
          ) : undefined
        })
    },
  }

  return (
    <View>
      {/* Log in */}
      {user === undefined ? jsx.auth() : undefined}

      {/* Stars */}
      {!ratingCheck && ratingNew === 0 && user !== undefined && roleB !== true
        ? jsx.stars()
        : undefined}

      {/* Add a comment */}
      {ratingCheck && user !== undefined && roleB !== true
        ? jsx.setComment()
        : undefined}

      {/* Comments */}
      {jsx.comments()}
    </View>
  )
}

const mixins = StyleSheet.create({
  ...Mixins,
  h3: {
    fontWeight: "700",
    fontSize: 15,
  },
})

const styles = StyleSheet.create({
  stars: { ...mixins.center, marginVertical: 10 },
  comment: {
    marginHorizontal: 5,
    marginBottom: 10,
  },
  comment2: { ...mixins.inline, ...mixins.center },
  image: { height: 50, width: 50, borderRadius: 100 },
  text: { ...mixins.h3, marginLeft: 10 },
})

type RoleB = { [key in Dec.DB.Role["id"]]: Dec.DB.Role["userStatus"] }

declare class DataI {
  /** ### Get ID-Username pairs */
  getUsersIDName(users: Dec.DB.User[] | undefined): { [x: string]: Dec.DB.User }
  /** ### Has the user rated? */
  ratingUserCheck(recipe: Dec.DB.Recipe, user: Dec.DB.User | undefined): boolean
  setRating(
    recipeID: string | undefined,
    rating: number,
    update: (param: Dec.General.Update) => void // Refresh collections
  ): Promise<void>
  setComment(
    recipeID: string,
    message: [string, React.Dispatch<React.SetStateAction<string>>],
    update: (param: Dec.General.Update) => void // Refresh collections
  ): Promise<void>
  roles(
    user: Dec.DB.User | undefined,
    roles: Dec.DB.Role[] | undefined
  ): [boolean, RoleB]
}

class Data implements DataI {
  private collections: Dec.General.Update = {
    recipes: true,
    comments: true,
    users: true,
  }

  getUsersIDName(users: Dec.DB.User[] | undefined): {
    [x: string]: Dec.DB.User
  } {
    let IDName: { [x: string]: Dec.DB.User } = {}
    if (users && users.length > 0) users.map((i) => (IDName[i.id] = i))
    return IDName
  }

  ratingUserCheck(
    recipe: Dec.DB.Recipe,
    user: Dec.DB.User | undefined
  ): boolean {
    return recipe?.ratingUserID.findIndex((i) => i === user?.id) !== -1
  }

  async setRating(
    recipeID: string | undefined,
    rating: number,
    update: (param: Dec.General.Update) => void
  ) {
    if (rating[0] === 0 || recipeID === undefined || recipeID === "") {
      console.error("Отсутствует rating или recipeID")
      return
    }
    await new Comment().setComment({ recipeID, rating: rating[0] })
    update(this.collections)
  }

  async setComment(
    recipeID: string,
    message: [string, React.Dispatch<React.SetStateAction<string>>],
    update: (param: Dec.General.Update) => void
  ) {
    if (message[0] === "" || recipeID === undefined || recipeID === "") {
      console.error("Отсутствует message или recipeID")
      return
    }
    await new Comment().setComment({ recipeID, text: message[0] })
    message[1]("")
    update(this.collections)
  }

  roles(
    user: Dec.DB.User | undefined,
    roles: Dec.DB.Role[] | undefined
  ): [boolean, RoleB] {
    if (roles === undefined) return [false, {}]

    const b: RoleB = {}
    for (const i of roles) {
      b[i.id] = i.userStatus
    }

    const roleB: boolean =
      roles !== undefined && user?.id !== undefined && b[user.id] === "b"

    return [roleB, b]
  }
}
